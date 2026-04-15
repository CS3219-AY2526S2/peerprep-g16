import {
  Controller,
  Post,
  Get,
  Param,
  NotFoundException,
  UseGuards,
  ForbiddenException,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { SessionsService } from './sessions.service';
import { UserGuard } from '../auth/user.guard';

type AuthenticatedRequest = Request & {
  user?: { id: string; isAdmin: boolean };
};

@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @UseGuards(UserGuard)
  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const session = this.sessionsService.findOne(id);
    if (!session) throw new NotFoundException('Session not found');

    // ensure requesting user belongs to this session
    const userId = req.user?.id;
    if (session.userAId !== userId && session.userBId !== userId) {
      throw new ForbiddenException('You are not part of this session');
    }

    return session;
  }

  @UseGuards(UserGuard)
  @Post(':id/end')
  async endSession(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const session = this.sessionsService.findOne(id);
    if (!session) throw new NotFoundException('Session not found');

    // ensure requesting user belongs to this session
    const userId = req.user?.id;
    if (session.userAId !== userId && session.userBId !== userId) {
      throw new ForbiddenException('You are not part of this session');
    }

    await this.sessionsService.endSession(id);
    return { message: 'Session ended', redirectUrl: '/homepage' };
  }
}
