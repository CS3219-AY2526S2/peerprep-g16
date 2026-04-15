import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  NotFoundException,
  UseGuards,
  ForbiddenException,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { SessionsService } from './sessions.service';
import { UserGuard } from '../auth/user.guard';

type AuthenticatedRequest = Request & {
  user?: { id: string; isAdmin: boolean };
};

@Controller('sessions')
export class SessionsController {
  constructor(
    private readonly sessionsService: SessionsService,
    private readonly configService: ConfigService,
  ) {}

  @Post('create')
  async create(
    @Body()
    body: {
      userAId: string;
      userBId: string;
      matchId: string;
      topic: string;
      userADifficulty: string;
      userBDifficulty: string;
    },
  ) {
    return this.sessionsService.create(body);
  }

  @UseGuards(UserGuard)
  @Get('active')
  async getActiveSession(@Req() req: AuthenticatedRequest) {
    const userId = req.user!.id;
    const session = await this.sessionsService.getActiveSessionForUser(userId);
    if (!session) throw new NotFoundException('No active session found');
    return session;
  }

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

  @UseGuards(UserGuard)
  @Post(':id/rejoin')
  rejoinSession(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const session = this.sessionsService.findOne(id);
    if (!session) throw new NotFoundException('Session not found');

    const userId = req.user!.id;
    if (session.userAId !== userId && session.userBId !== userId) {
      throw new ForbiddenException('You are not part of this session');
    }

    if (session.status !== 'active') {
      throw new NotFoundException('Session is no longer active');
    }

    const token = req.headers.authorization!.split(' ')[1];
    const wsUrl =
      this.configService.get<string>('COLLAB_SERVICE_URL') ??
      'http://localhost:3003';
    return { sessionId: id, token, wsUrl };
  }
}
