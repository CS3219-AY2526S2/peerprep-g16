import { Controller, Post, Get, Delete, Body, Param } from '@nestjs/common';
import { MatchingService } from './match.service';

@Controller('match')
export class MatchController {
    constructor(private readonly matchService: MatchingService) {}

    @Post()
    async joinQueue(@Body() body: any) {
        const { userId, username, topic, difficulty } = body;
        if (!userId || !username || !topic) {
            return { message: 'userId, username and topic are required' };
        }
        return await this.matchService.joinQueue(userId, username, topic, difficulty);
    }

    @Get(':userId')
    async getStatus(@Param('userId') userId: string) {
        return await this.matchService.getQueueStatus(userId);
    }

    @Delete(':userId')
    async leaveQueue(@Param('userId') userId: string) {
        await this.matchService.leaveQueue(userId);
        return { message: 'Left queue successfully' };
    }
}