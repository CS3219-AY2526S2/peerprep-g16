import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';
import { SessionState, SessionStateSchema } from './session-state.schema';

@Module({
    imports: [
        ConfigModule,
        MongooseModule.forFeature([{ name: SessionState.name, schema: SessionStateSchema }]),
    ],
    controllers: [SessionsController],
    providers: [SessionsService],
    exports: [SessionsService],
})
export class SessionsModule {}