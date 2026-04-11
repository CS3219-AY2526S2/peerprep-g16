import { Controller, Post, Get, Delete, Body, Param } from '@nestjs/common';
import { MatchService } from './match.service';
import { RedisService } from '../redis/redis.service';

@Controller('api/match')
export class MatchController {
  constructor(
    private readonly matchService: MatchService,
    private readonly redisService: RedisService,
  ) { }
  @Post()
  async joinQueue(@Body() body: any) {
    const { userId, username, topic, difficulty } = body;
    if (!userId || !username || !topic) {
      return { message: 'userId, username and topic are required' };
    }
    return await this.matchService.joinQueue(userId, username, topic, difficulty);
  }

  @Get('peek/:userId')
  async peekStatus(@Param('userId') userId: string) {
    return await this.matchService.peekQueueStatus(userId);
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

  /**
   * GET /api/match/health
   *
   * Health check endpoint - verifies Redis connection
   */
  @Get('health')
  async healthCheck() {
    try {
      const pong = await this.redisService.ping();
      return {
        status: 'healthy',
        redis: pong === 'PONG' ? 'connected' : 'error',
      };
    } catch {
      return {
        status: 'unhealthy',
        redis: 'disconnected',
      };
    }
  }
}
