import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  HttpException,
  HttpStatus,
  Res,
  Inject,
  Delete,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import { Logger } from 'winston';
import { QuizDto } from './dto/quiz.dto';
import { QuizzesService } from './quizzes.service';
import { QuizzesDto } from './dto/quizzes.dto';
import { CommandRequestDto, MODE } from './dto/command-request.dto';
import {
  CommandResponseDto,
  ForbiddenResponseDto,
} from './dto/command-response.dto';
import { SessionService } from '../session/session.service';
import { Response } from 'express';
import { ContainersService } from '../containers/containers.service';
import { SessionId } from '../session/session.decorator';
import { SessionGuard } from '../session/session.guard';
import { CommandGuard } from '../common/command.guard';
import { QuizWizardService } from '../quiz-wizard/quiz-wizard.service';
import { Fail, SubmitDto, Success } from './dto/submit.dto';
import { preview } from '../common/util';

@ApiTags('quizzes')
@Controller('api/v1/quizzes')
export class QuizzesController {
  constructor(
    private readonly quizService: QuizzesService,
    private readonly sessionService: SessionService,
    private readonly containerService: ContainersService,
    private readonly quizWizardService: QuizWizardService,
    @Inject('winston') private readonly logger: Logger,
  ) {}

  @Get(':id')
  @ApiOperation({ summary: 'ID를 통해 문제 정보를 가져올 수 있습니다.' })
  @ApiResponse({
    status: 200,
    description: 'Returns the quiz details',
    type: QuizDto,
  })
  @ApiParam({ name: 'id', description: '문제 ID' })
  async getProblemById(@Param('id') id: number): Promise<QuizDto> {
    const quizDto = await this.quizService.getQuizById(id);

    return quizDto;
  }

  @Get('/')
  @ApiOperation({
    summary: '카테고리 별로 모든 문제의 제목과 id를 가져올 수 있습니다.',
  })
  @ApiResponse({
    status: 200,
    description: '카테고리 별로 문제의 제목과 id가 리턴됩니다.',
    type: QuizzesDto,
  })
  async getProblemsGroupedByCategory(): Promise<QuizzesDto> {
    return this.quizService.findAllProblemsGroupedByCategory();
  }

  @Post(':id/command')
  @UseGuards(CommandGuard)
  @ApiOperation({ summary: 'Git 명령을 실행합니다.' })
  @ApiResponse({
    status: 200,
    description: 'Git 명령의 실행 결과(stdout/stderr)를 리턴합니다.',
    type: CommandResponseDto,
  })
  @ApiForbiddenResponse({
    description: '금지된 명령이거나, editor를 연속으로 사용했을때',
    type: ForbiddenResponseDto,
  })
  @ApiParam({ name: 'id', description: '문제 ID' })
  @ApiBody({ description: 'Command to be executed', type: CommandRequestDto })
  async runGitCommand(
    @Param('id') id: number,
    @Body() execCommandDto: CommandRequestDto,
    @Res() response: Response,
    @SessionId() sessionId: string,
  ): Promise<CommandResponseDto> {
    try {
      if (!sessionId) {
        // 세션 아이디가 없다면
        this.logger.log('info', 'no session id. creating session..');
        response.cookie(
          'sessionId',
          (sessionId = await this.sessionService.createSession()),
          {
            httpOnly: true,
          },
        ); // 세션 아이디를 생성한다.
        this.logger.log('info', `session id: ${sessionId} created`);
      }

      let containerId = await this.sessionService.getContainerIdBySessionId(
        sessionId,
        id,
      );

      // 컨테이너가 없거나, 컨테이너가 유효하지 않다면 새로 생성한다.
      if (
        !containerId ||
        !(await this.containerService.isValidateContainerId(containerId))
      ) {
        this.logger.log(
          'info',
          'no docker container or invalid container Id. creating container..',
        );
        containerId = await this.containerService.getContainer(id);
        await this.sessionService.setContainerBySessionId(
          sessionId,
          id,
          containerId,
        );
      }

      // 리팩토링 필수입니다.
      let message: string, result: string;

      // command mode
      if (execCommandDto.mode === MODE.COMMAND) {
        this.logger.log(
          'info',
          `running command "${execCommandDto.message}" for container ${containerId}`,
        );

        ({ message, result } = await this.containerService.runGitCommand(
          containerId,
          execCommandDto.message,
        ));
      } else if (execCommandDto.mode === MODE.EDITOR) {
        // editor mode
        const { mode: recentMode, message: recentMessage } =
          await this.sessionService.getRecentLog(sessionId, id);

        // editor를 연속으로 사용했을 때
        if (recentMode === MODE.EDITOR) {
          response.status(HttpStatus.FORBIDDEN).send({
            message: '편집기 명령 순서가 아닙니다',
            error: 'Forbidden',
            statusCode: 403,
          });
          return;
        }

        this.logger.log(
          'info',
          `running editor command "${recentMessage}" for container ${containerId} with body starts with "${preview(
            execCommandDto.message,
          )}"`,
        );

        ({ message, result } = await this.containerService.runEditorCommand(
          containerId,
          recentMessage,
          execCommandDto.message,
        ));
      } else {
        response.status(HttpStatus.BAD_REQUEST).send({
          message: '잘못된 요청입니다.',
        });
      }

      // message를 저장합니다.
      this.sessionService.pushLogBySessionId(execCommandDto, sessionId, id);

      response.status(HttpStatus.OK).send({
        message,
        result,
        // graph: 필요한 경우 여기에 추가
      });
      return;
    } catch (error) {
      this.logger.log('error', error);
      throw new HttpException(
        {
          message: 'Internal Server Error',
          result: 'fail',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':id/command')
  @UseGuards(SessionGuard)
  @ApiOperation({ summary: 'Git 명령기록과, 할당된 컨테이너를 삭제합니다' })
  @ApiResponse({
    status: 200,
    description:
      'session에 저장된 command 기록과 컨테이너를 삭제하고, 실제 컨테이너도 삭제 합니다',
  })
  @ApiParam({ name: 'id', description: '문제 ID' })
  async deleteCommandHistory(
    @Param('id') id: number,
    @SessionId() sessionId: string,
  ): Promise<void> {
    try {
      const containerId = await this.sessionService.getContainerIdBySessionId(
        sessionId,
        id,
      );

      if (!containerId) {
        return;
      }

      this.containerService.deleteContainer(containerId);

      this.sessionService.deleteCommandHistory(sessionId, id);
    } catch (e) {
      throw new HttpException(
        {
          message: 'Internal Server Error',
          result: 'fail',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':id/submit')
  @UseGuards(SessionGuard)
  @ApiOperation({ summary: '채점을 요청합니다.' })
  @ApiResponse({
    status: 200,
    description: '채점 결과를 리턴합니다.',
    type: Success,
  })
  @ApiParam({ name: 'id', description: '문제 ID' })
  async submit(
    @Param('id') id: number,
    @SessionId() sessionId: string,
  ): Promise<SubmitDto> {
    try {
      const containerId = await this.sessionService.getContainerIdBySessionId(
        sessionId,
        id,
      );

      if (!containerId) {
        return;
      }

      if (!(await this.containerService.isValidateContainerId(containerId))) {
        // 재현해서 컨테이너 발급하기
        return;
      }

      const result: boolean = await this.quizWizardService.submit(
        containerId,
        id,
      );

      if (!result) {
        return new Fail();
      }

      //create link
      return new Success('notImplemented');
    } catch (e) {
      throw new HttpException(
        {
          message: 'Internal Server Error',
          result: 'fail',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
