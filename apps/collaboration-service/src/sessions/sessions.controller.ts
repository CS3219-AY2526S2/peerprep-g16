import { Controller, Post, Get, Body, Param, NotFoundException, UseGuards } from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { UserGuard } from '../auth/user.guard';

@Controller('sessions')
export class SessionsController {
    constructor(private readonly sessionsService: SessionsService) {}

    /**
     * Called by Matching Service when a match is found.
     * Creates a session and returns sessionId + full session data.
     * Matching Service should forward the sessionId to both users.
     */
    @Post('create')
    async create(@Body() body: {
        userId: string;
        peerId: string;
        matchId: string;
        topic: string;
        userDifficulty: string;
        peerDifficulty: string;
    }) {
        return this.sessionsService.create(body);
    }

    /**
     * Called by Frontend on collaboration page load.
     * Returns full session data including question, code, and whiteboard state.
     */
    @UseGuards(UserGuard)
    @Get(':id')
    findOne(@Param('id') id: string) {
        const session = this.sessionsService.findOne(id);
        if (!session) throw new NotFoundException('Session not found');
        return session;
    }

    /**
     * Called by Frontend when user clicks "End Session".
     * Ends the session and clears it from memory.
     * Frontend should redirect to /homepage on success.
     */
    @UseGuards(UserGuard)
    @Post(':id/end')
    async endSession(@Param('id') id: string) {
        const session = await this.sessionsService.endSession(id);
        if (!session) throw new NotFoundException('Session not found');
        return { message: 'Session ended', redirectUrl: '/homepage' };
    }
}