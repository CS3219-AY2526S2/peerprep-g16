import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * Event payload published by user-service whenever a user's admin privilege changes.
 *
 * `timestamp` is expected to be a Unix timestamp in seconds
 * (for example, `Math.floor(Date.now() / 1000)`).
 */
type PrivilegeChangeEvent = {
  userId: string;
  oldIsAdmin: boolean;
  newIsAdmin: boolean;
  timestamp: number;
};

/**
 * Service responsible for tracking privilege-change events across services.
 *
 * It listens to the Redis Pub/Sub `privilege:change` channel, stores the latest
 * revocation timestamp in an in-memory cache for fast lookup, and falls back to
 * Redis key-value storage when the local cache is cold.
 *
 * A token is considered revoked if its JWT `iat` is earlier than the stored
 * privilege-change timestamp for that user.
 */
@Injectable()
export class PrivilegeRevocationService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrivilegeRevocationService.name);

  private readonly revocationCache = new Map<string, number>();

  private readonly redisClient: Redis;

  private readonly redisSubscriber: Redis;

  private readonly channelName = 'privilege:change';

  /**
   * Creates the Redis clients using environment-backed configuration.
   *
   * Expected env vars:
   * - `REDIS_HOST`
   * - `REDIS_PORT`
   * - `REDIS_PASSWORD` (optional)
   *
   * @param configService Nest config service used to read Redis connection settings
   */
  constructor(private readonly configService: ConfigService) {
    const redisOptions = {
      host: this.configService.get<string>('REDIS_HOST') || 'localhost',
      port: parseInt(
        this.configService.get<string>('REDIS_PORT') || '6379',
        10,
      ),
      password: this.configService.get<string>('REDIS_PASSWORD') || undefined,
      retryStrategy: (times: number) => Math.min(times * 50, 2000),
    };

    this.redisClient = new Redis(redisOptions);
    this.redisSubscriber = new Redis(redisOptions);
  }

  /**
   * Starts the Redis subscription and registers all Redis event handlers.
   *
   * This runs automatically when the Nest module is initialized.
   */
  async onModuleInit(): Promise<void> {
    this.registerRedisEventHandlers();

    await this.redisSubscriber.subscribe(this.channelName);
    this.logger.log(`Subscribed to Redis channel "${this.channelName}"`);
  }

  /**
   * Gracefully closes both Redis connections during app shutdown.
   *
   * This helps avoid leaking open sockets when the Nest application stops.
   */
  async onModuleDestroy(): Promise<void> {
    await Promise.allSettled([
      this.redisSubscriber.quit(),
      this.redisClient.quit(),
    ]);
  }

  /**
   * Determines whether a JWT should be treated as revoked because the user's
   * privilege changed after the token was issued.
   *
   * Resolution order:
   * 1. Check the local in-memory cache
   * 2. If missing, fall back to Redis key-value lookup
   * 3. If still missing, treat the token as valid
   *
   * If the token has no `iat`, the safest behavior is to reject it.
   *
   * @param userId Authenticated user's ID from the JWT payload
   * @param issuedAt JWT `iat` claim in Unix seconds
   * @returns `true` if the token should be rejected, otherwise `false`
   */
  async isTokenRevoked(userId: string, issuedAt?: number): Promise<boolean> {
    if (!issuedAt) {
      this.logger.warn(`Token for user ${userId} missing iat; rejecting`);
      return true;
    }

    let revokedAfter = this.revocationCache.get(userId);

    if (revokedAfter === undefined) {
      const redisValue = await this.redisClient.get(
        this.getRevocationKey(userId),
      );

      if (redisValue !== null) {
        revokedAfter = Number(redisValue);

        if (!Number.isNaN(revokedAfter)) {
          this.revocationCache.set(userId, revokedAfter);
        } else {
          revokedAfter = undefined;
        }
      }
    }

    if (revokedAfter === undefined) {
      return false;
    }

    return issuedAt < revokedAfter;
  }

  /**
   * Attaches listeners for Redis Pub/Sub messages and connection-level errors.
   *
   * When a `privilege:change` event is received, this handler:
   * - validates the payload
   * - updates the local cache
   * - persists the latest timestamp to Redis for cold-start fallback
   */
  private registerRedisEventHandlers(): void {
    this.redisSubscriber.on('message', (channel, message) => {
      void this.handlePrivilegeChangeMessage(channel, message);
    });

    this.redisSubscriber.on('error', (error) => {
      this.logger.error(
        'Redis subscriber error',
        error instanceof Error ? error.stack : undefined,
      );
    });

    this.redisClient.on('error', (error) => {
      this.logger.error(
        'Redis client error',
        error instanceof Error ? error.stack : undefined,
      );
    });
  }

  /**
   * Processes a single privilege-change Pub/Sub message from Redis.
   *
   * The handler validates the incoming payload, updates the in-memory revocation
   * cache, and persists the latest timestamp to Redis so newly started instances
   * can enforce revocations immediately.
   *
   * This method is invoked through a fire-and-forget event listener so the Redis
   * callback itself can remain synchronous and satisfy linting rules.
   *
   * @param channel Redis Pub/Sub channel name
   * @param message Raw JSON event payload
   * @returns Promise that resolves when processing is complete
   */
  private async handlePrivilegeChangeMessage(
    channel: string,
    message: string,
  ): Promise<void> {
    if (channel !== this.channelName) {
      return;
    }
    try {
      const event = JSON.parse(message) as PrivilegeChangeEvent;

      if (!event.userId || typeof event.timestamp !== 'number') {
        this.logger.warn(
          `Ignoring malformed privilege change event: ${message}`,
        );
        return;
      }

      const key = this.getRevocationKey(event.userId);
      const previousTimestamp = this.revocationCache.get(event.userId);

      if (
        previousTimestamp === undefined ||
        event.timestamp > previousTimestamp
      ) {
        this.revocationCache.set(event.userId, event.timestamp);
        await this.redisClient.set(key, String(event.timestamp));
      }

      this.logger.log(
        `Updated privilege revocation timestamp for user ${event.userId} to ${event.timestamp}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to process privilege change event: ${message}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  /**
   * Builds the Redis key used to store the latest privilege-change timestamp
   * for a specific user.
   *
   * @param userId User identifier
   * @returns Redis key for privilege revocation tracking
   */
  private getRevocationKey(userId: string): string {
    return `privilegeChangedAfter:${userId}`;
  }
}
