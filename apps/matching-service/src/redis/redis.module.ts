import { Global, Module } from '@nestjs/common';
import { RedisService } from './redis.service';

/**
 * @Global() makes RedisService available to ALL modules
 * without needing to import RedisModule everywhere.
 *
 * This is like a singleton — one Redis connection shared
 * across the entire application.
 */
@Global()
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
