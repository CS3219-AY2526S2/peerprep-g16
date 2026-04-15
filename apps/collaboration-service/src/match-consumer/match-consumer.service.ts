import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { SessionsService } from '../sessions/sessions.service';

const STREAM_NAME = 'match.found';
const GROUP_NAME = 'collaboration-service-group';

@Injectable()
export class MatchConsumerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MatchConsumerService.name);
  private redis: Redis;
  private running = false;
  private readonly consumerId = `collab-${process.pid}`;

  constructor(
    private readonly configService: ConfigService,
    private readonly sessionsService: SessionsService,
  ) {}

  async onModuleInit() {
    const redisUrl =
      this.configService.get<string>('REDIS_URL') ?? 'redis://localhost:6379';
    this.redis = new Redis(redisUrl);
    this.redis.on('error', (err) =>
      this.logger.error(`Redis stream error: ${err.message}`),
    );

    // Create consumer group — '$' means only new messages; MKSTREAM creates stream if missing
    try {
      await this.redis.xgroup(
        'CREATE',
        STREAM_NAME,
        GROUP_NAME,
        '$',
        'MKSTREAM',
      );
      this.logger.log(
        `Consumer group "${GROUP_NAME}" created on "${STREAM_NAME}"`,
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('BUSYGROUP')) {
        this.logger.log(
          `Consumer group "${GROUP_NAME}" already exists — resuming`,
        );
      } else {
        this.logger.error(`Failed to create consumer group: ${message}`);
      }
    }

    this.running = true;
    void this.poll();
  }

  onModuleDestroy() {
    this.running = false;
    this.redis.disconnect();
  }

  private async poll() {
    while (this.running) {
      try {
        const results = await this.redis.xreadgroup(
          'GROUP',
          GROUP_NAME,
          this.consumerId,
          'COUNT',
          '10',
          'BLOCK',
          '5000',
          'STREAMS',
          STREAM_NAME,
          '>',
        );

        if (!results) continue; // BLOCK timeout, no messages

        for (const [, messages] of results as Array<[string, Array<[string, string[]]>]>) {
          for (const [id, fields] of messages) {
            try {
              const event = parseFields(fields);
              await this.processEvent(event);
            } catch (err: unknown) {
              const message = err instanceof Error ? err.message : String(err);
              this.logger.error(`Failed to process message ${id}: ${message}`);
            } finally {
              // Always ACK so we don't reprocess indefinitely on error
              await this.redis.xack(STREAM_NAME, GROUP_NAME, id);
            }
          }
        }
      } catch (err: unknown) {
        if (this.running) {
          const message = err instanceof Error ? err.message : String(err);
          this.logger.error(`Stream poll error: ${message}`);
          await sleep(1000);
        }
      }
    }
  }

  private async processEvent(event: Record<string, string>) {
    const {
      matchId,
      userAId,
      userBId,
      topic,
      userADifficulty,
      userBDifficulty,
    } = event;

    if (!matchId || !userAId || !userBId) {
      this.logger.warn(
        `Malformed match.found event, skipping: ${JSON.stringify(event)}`,
      );
      return;
    }

    this.logger.log(`Received match.found: ${matchId}`);
    await this.sessionsService.createFromMatchEvent({
      matchId,
      userAId,
      userBId,
      topic: topic ?? '',
      userADifficulty: userADifficulty ?? 'Easy',
      userBDifficulty: userBDifficulty ?? 'Easy',
    });
  }
}

function parseFields(fields: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (let i = 0; i < fields.length; i += 2) {
    result[fields[i]] = fields[i + 1];
  }
  return result;
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}
