import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Logger } from 'winston';
import { CommandResponseDto } from '../quizzes/dto/command-response.dto';
import shellEscape from 'shell-escape';
import { v4 as uuidv4 } from 'uuid';
import { ActionType } from '../session/schema/session.schema';
import { CommandService } from '../command/command.service';

@Injectable()
export class ContainersService {
  constructor(
    private configService: ConfigService,
    @Inject('winston') private readonly logger: Logger,
    private commandService: CommandService,
  ) {}

  private getGitCommand(container: string, command: string): string {
    return `docker exec -w /home/quizzer/quiz/ -u quizzer ${container} /usr/local/bin/restricted-shell ${command}`;
  }
  async runGitCommand(
    container: string,
    command: string,
  ): Promise<CommandResponseDto> {
    const { stdoutData, stderrData } = await this.commandService.executeCommand(
      this.getGitCommand(container, command),
    );

    const patternIndex = stdoutData.indexOf('# CREATED_BY_OUTPUT.SH\n');

    if (patternIndex !== -1) {
      const message = stdoutData.slice(0, patternIndex);
      return {
        message,
        result: 'editor',
      };
    }

    if (stderrData) {
      return { message: stderrData, result: 'fail' };
    }

    return { message: stdoutData, result: 'success' };
  }

  private getEditorCommand(
    container: string,
    message: string,
    command: string,
  ): string {
    const escapedMessage = shellEscape([message]);

    return `docker exec -w /home/quizzer/quiz/ -u quizzer ${container} sh -c "git config --global core.editor /editor/input.sh && echo ${escapedMessage} | ${command}; git config --global core.editor /editor/output.sh"`;
  }
  async runEditorCommand(
    container: string,
    command: string,
    message: string,
  ): Promise<CommandResponseDto> {
    const { stdoutData, stderrData } = await this.commandService.executeCommand(
      this.getEditorCommand(container, message, command),
    );

    if (stderrData) {
      return { message: stderrData, result: 'fail' };
    }

    return { message: stdoutData, result: 'success' };
  }

  async getContainer(quizId: number): Promise<string> {
    // 일단은 컨테이너를 생성해 준다.
    // 차후에는 준비된 컨테이너 중 하나를 선택해서 준다.
    // quizId에 대한 유효성 검사는 이미 끝났다(이미 여기서는 DB 접근 불가)

    const user: string = this.configService.get<string>(
      'CONTAINER_GIT_USERNAME',
    );

    const containerId = uuidv4();

    const createContainerCommand = `docker run -itd --network none -v ~/editor:/editor \
--name ${containerId} mergemasters/alpine-git:0.2 /bin/sh`;
    const copyFilesCommand = `docker cp ~/quizzes/${quizId}/. ${containerId}:/home/${user}/quiz/`;
    const copyOriginCommand = `[ -d ~/origins/${quizId} ] && docker cp ~/origins/${quizId}/. ${containerId}:/origin/`;
    const copyUpstreamCommand = `[ -d ~/upstreams/${quizId} ] && docker cp ~/upstreams/${quizId}/. ${containerId}:/upstream/`;
    const chownCommand = `docker exec -u root ${containerId} chown -R ${user}:${user} /home/${user}`;
    const chownOriginCommand = `[ -d ~/origins/${quizId} ] && docker exec -u root ${containerId} chown -R ${user}:${user} /origin`;
    const chownUpstreamCommand = `[ -d ~/upstreams/${quizId} ] && docker exec -u root ${containerId} chown -R ${user}:${user} /remote`;
    const coreEditorCommand = `docker exec -w /home/quizzer/quiz/ -u ${user} ${containerId} git config --global core.editor /editor/output.sh`;
    await this.commandService.executeCommand(
      createContainerCommand,
      copyFilesCommand,
      copyOriginCommand,
      copyUpstreamCommand,
      chownCommand,
      chownOriginCommand,
      chownUpstreamCommand,
      coreEditorCommand,
    );

    return containerId;
  }

  async isValidateContainerId(containerId: string): Promise<boolean> {
    const command = `docker ps -a --filter "name=${containerId}" --format "{{.ID}}"`;

    const { stdoutData, stderrData } =
      await this.commandService.executeCommand(command);

    if (stderrData) {
      // 도커 미설치 등의 에러일 듯
      throw new Error(stderrData);
    }

    return stdoutData.trim() !== '';
  }

  async deleteContainer(containerId: string): Promise<void> {
    const command = `docker rm -f ${containerId}`;

    const { stdoutData, stderrData } =
      await this.commandService.executeCommand(command);

    this.logger.log('info', `container deleted : ${stdoutData.trim()}`);

    if (stderrData) {
      throw new Error(stderrData);
    }
  }

  async restoreContainer(logObject: {
    status: string;
    logs: {
      mode: ActionType;
      message: string;
    }[];
    containerId: string;
  }): Promise<void> {
    this.logger.log('info', 'restoring container...');
    const { logs, containerId } = logObject;

    let recentMessage = '';

    const commands: string[] = logs.map((log) => {
      if (log.mode === 'command') {
        recentMessage = log.message;
        return this.getGitCommand(containerId, log.message);
      } else if (log.mode === 'editor') {
        return this.getEditorCommand(containerId, log.message, recentMessage);
      } else {
        throw new Error('Invalid log mode');
      }
    });

    await this.commandService.executeCommand(...commands);

    // for (const log of logs) {
    //   if (log.mode === 'command') {
    //     await this.runGitCommand(containerId, log.message);
    //   } else if (log.mode === 'editor') {
    //     await this.runEditorCommand(containerId, recentMessage, log.message);
    //   } else {
    //     throw new Error('Invalid log mode');
    //   }
    //   recentMessage = log.message;
    // }
  }
}
