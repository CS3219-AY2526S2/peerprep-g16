import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class MatchService {
  private readonly logger = new Logger(MatchService.name);
  private readonly STREAM_NAME =
    process.env.MATCH_FOUND_STREAM || 'match.found';

  constructor(private readonly redisService: RedisService) {}

  /**
   * Publishes a match.found event to Redis Streams.
   *
   * Event payload matches what Collaboration Service expects:
   * {
   *   matchId: string,
   *   userAId: string,
   *   userBId: string,
   *   topic: string,
   *   userADifficulty: "Easy" | "Medium" | "Hard",
   *   userBDifficulty: "Easy" | "Medium" | "Hard"
   * }
   *
   * This will be called by:
   * 1. The test endpoint (for now)
   * 2. Your teammate's matching algorithm (later)
   */
  async publishMatchFound(
    userAId: string,
    userBId: string,
    topic: string,
    userADifficulty: string,
    userBDifficulty: string,
  ) {
    const matchId = uuidv4();

    const messageId = await this.redisService.publishToStream(
      this.STREAM_NAME,
      {
        matchId,
        userAId,
        userBId,
        topic,
        userADifficulty,
        userBDifficulty,
        timestamp: new Date().toISOString(),
      },
    );

    this.logger.log(
      'Match found! ' +
        userAId +
        ' <-> ' +
        userBId +
        ' | Topic: ' +
        topic +
        ' | Difficulty: ' +
        userADifficulty +
        '/' +
        userBDifficulty,
    );

    return {
      matchId,
      userAId,
      userBId,
      topic,
      userADifficulty,
      userBDifficulty,
      streamMessageId: messageId,
    };
  }
}
