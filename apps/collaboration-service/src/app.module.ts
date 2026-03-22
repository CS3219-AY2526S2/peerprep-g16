import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SessionsModule } from './sessions/sessions.module';
import { WhiteboardModule } from './whiteboard/whiteboard.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    SessionsModule,
    WhiteboardModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
