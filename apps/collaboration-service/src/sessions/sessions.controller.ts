import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { SessionsService } from './sessions.service';

@Controller('sessions')
export class SessionsController {
    constructor(private readonly sessionsService: SessionsService) { }

    // Called by Matching Service when a match is found
    @Post('create')
    create(@Body() body: {
        userId: string;
        peerId: string;
        matchId: string;
        question: any;
        language: string;
    }) {
        const session = this.sessionsService.create(body);
        return session;
    }

    // Called by Frontend on page load to get session + question data
    @Get(':id')
    findOne(@Param('id') id: string) {
        const session = this.sessionsService.findOne(id);
        if (!session) {
            return { error: 'Session not found' };
        }
        return session;
    }

    // Called by Frontend when user ends session
    @Post(':id/end')
    endSession(@Param('id') id: string) {
        const session = this.sessionsService.endSession(id);
        if (!session) {
            return { error: 'Session not found' };
        }
        return { message: 'Session ended', redirectUrl: '/homepage' };
    }
}