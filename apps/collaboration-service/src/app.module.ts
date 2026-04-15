import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SessionsModule } from './sessions/sessions.module';
import { WhiteboardModule } from './whiteboard/whiteboard.module';
import { MatchConsumerModule } from './match-consumer/match-consumer.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRoot(process.env.MONGODB_URI || ''),
    SessionsModule,
    WhiteboardModule,
    MatchConsumerModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
