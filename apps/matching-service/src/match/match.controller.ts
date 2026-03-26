import { Controller, Post, Get, Delete, Body, Param } from '@nestjs/common';
import { MatchService } from './match.service';
import { RedisService } from '../redis/redis.service';
import { SimulateMatchDto } from './dto/simulate-match.dto';

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


@Controller('api/match')
export class MatchController {
  constructor(
    private readonly matchService: MatchService,
    private readonly redisService: RedisService,
  ) {}

  /**
   * POST /api/match/simulate
   *
   * TEMPORARY test endpoint - simulates a match being found.
   * Your teammate's matching algorithm will call
   * matchService.publishMatchFound() directly.
   */
  @Post('simulate')
  async simulateMatch(@Body() body: SimulateMatchDto) {
    const { userAId, userBId, topic, userADifficulty, userBDifficulty } = body;

    if (
      !userAId ||
      !userBId ||
      !topic ||
      !userADifficulty ||
      !userBDifficulty
    ) {
      return {
        error:
          'Missing required fields: userAId, userBId, topic, userADifficulty, userBDifficulty',
      };
    }

    const result = await this.matchService.publishMatchFound(
      userAId,
      userBId,
      topic,
      userADifficulty,
      userBDifficulty,
    );

    return {
      message: 'Match found and event published!',
      data: result,
    };
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
