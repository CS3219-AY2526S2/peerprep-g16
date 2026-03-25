import { Controller, Post, Get, Body, Param, NotFoundException, BadRequestException, UseGuards, ForbiddenException, Req } from '@nestjs/common';
import { Request } from 'express';
import { SessionsService } from './sessions.service';
import { UserGuard } from '../auth/user.guard';

type AuthenticatedRequest = Request & {
    user?: { id: string; isAdmin: boolean };
};

@Controller('sessions')
export class SessionsController {
    constructor(private readonly sessionsService: SessionsService) {}

    @Post('create')
    async create(@Body() body: {
        userAId: string;
        userBId: string;
        matchId: string;
        topic: string;
        userADifficulty: string;
        userBDifficulty: string;
    }) {
        return this.sessionsService.create(body);
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

    // Called by Question Service (service-to-service, no user auth)
    @Post(':id/question')
    async attachQuestion(
        @Param('id') id: string,
        @Body() body: { question: any },
    ) {
        if (!body.question) throw new BadRequestException('question is required');
        const session = this.sessionsService.findOne(id);
        if (!session) throw new NotFoundException('Session not found');
        await this.sessionsService.attachQuestion(id, body.question);
        return { message: 'Question attached' };
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