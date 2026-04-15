import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WhiteboardGateway } from './whiteboard.gateway';
import { SessionsModule } from '../sessions/sessions.module';

@Module({
  imports: [SessionsModule, ConfigModule], // needed to inject SessionsService
  providers: [WhiteboardGateway],
})
export class WhiteboardModule {}
