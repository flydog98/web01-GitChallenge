import { Controller, Delete, Res, UseInterceptors } from '@nestjs/common';
import { SessionService } from './session.service';
import { SessionId } from './session.decorator';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { SessionUpdateInterceptor } from './session-save.intercepter';

@ApiTags('session')
@Controller('api/v1/session')
@UseInterceptors(SessionUpdateInterceptor)
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  @Delete()
  @ApiOperation({ summary: '세션을 삭제합니다.' })
  @ApiResponse({
    status: 200,
    description: '세션을 삭제합니다.',
  })
  async deleteSession(
    @SessionId() sessionId: string,
    @Res() response: Response,
  ) {
    if (!sessionId) {
      response.end();
      return;
    }

    response.clearCookie('sessionId');
    this.sessionService.deleteSession(sessionId);
    response.end();
    return;
  }
}
