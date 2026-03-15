import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SessionsModule } from './sessions/sessions.module';
import { WhiteboardModule } from './whiteboard/whiteboard.module';

@Module({
  imports: [SessionsModule, WhiteboardModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
