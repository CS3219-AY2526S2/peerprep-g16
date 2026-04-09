import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MatchConsumerService } from './match-consumer.service';
import { SessionsModule } from '../sessions/sessions.module';

@Module({
    imports: [ConfigModule, SessionsModule],
    providers: [MatchConsumerService],
})
export class MatchConsumerModule {}
