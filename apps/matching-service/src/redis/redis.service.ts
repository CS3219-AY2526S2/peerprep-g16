import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis;
  private readonly logger = new Logger(RedisService.name);

  async onModuleInit(): Promise<void> {
    this.client = new Redis({
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      retryStrategy(times) {
        if (times > 10) return null;
        return Math.min(times * 500, 3000);
      },
      enableReadyCheck: true,
      maxRetriesPerRequest: 3,
    });

    this.client.on('error', (err: any) => {
      if (err.code === 'ECONNRESET') {
        this.logger.warn('Redis connection reset, reconnecting...');
        return;
      }
      this.logger.error('Redis connection error:', err);
    });

    await new Promise<void>((resolve, reject) => {
      this.client.once('ready', () => {
        this.logger.log('Connected to Redis');
        resolve();
      });

      this.client.once('error', (err: any) => {
        if (err.code !== 'ECONNRESET') {
          reject(err);
        }
      });
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
    this.logger.log('Redis connection closed');
  }

  getClient(): Redis {
    return this.client;
  }

  async publishToStream(
    streamName: string,
    data: Record<string, string>,
  ): Promise<string> {
    const fields: string[] = [];
    for (const [key, value] of Object.entries(data)) {
      fields.push(key, value);
    }

    const messageId = await this.client.xadd(streamName, '*', ...fields);

    if (!messageId) {
      throw new Error('Failed to publish to stream: ' + streamName);
    }

    this.logger.log('Published to ' + streamName + ': ' + messageId);
    return messageId;
  }

  async ping(): Promise<string> {
    return this.client.ping();
  }
}