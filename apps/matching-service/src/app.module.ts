import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RedisModule } from './redis/redis.module';
import { MatchModule } from './match/match.module';

@Module({
  imports: [ConfigModule.forRoot(),RedisModule, MatchModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}