import { Module } from '@nestjs/common';
import { WhiteboardGateway } from './whiteboard.gateway';
import { SessionsModule } from '../sessions/sessions.module';

@Module({
    imports: [SessionsModule], // needed to inject SessionsService
    providers: [WhiteboardGateway],
})
export class WhiteboardModule {}