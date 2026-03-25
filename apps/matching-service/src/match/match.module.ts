import { Module } from '@nestjs/common';
import { MatchController } from './match.controller';
import { MatchingService } from './match.service';

@Module({
    controllers: [MatchController],
    providers: [MatchingService],
})
export class MatchModule {}