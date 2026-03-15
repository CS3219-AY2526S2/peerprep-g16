import { Module } from '@nestjs/common';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';

@Module({
    controllers: [SessionsController],
    providers: [SessionsService],
    exports: [SessionsService], // so WhiteboardGateway can use it later
})
export class SessionsModule { }