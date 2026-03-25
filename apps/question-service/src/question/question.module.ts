import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminGuard } from '../auth/admin.guard';
import { Question, QuestionSchema } from './schemas/question.schema';
import { QuestionController } from './question.controller';
import { QuestionService } from './question.service';
import { RedisStreamsListeners } from 'src/redis/redis-streams.listener';
import { QuestionAssignmentService } from './question-assignment.service';
import { HttpModule } from '@nestjs/axios';
import { CollaborationClient } from 'src/clients/collaboration.client';

/**
 * Feature module for question management.
 * Registers the Question schema, controller, and service.
 */
@Module({
  imports: [
    HttpModule,
    MongooseModule.forFeature([
      { name: Question.name, schema: QuestionSchema },
    ]),
  ],
  controllers: [QuestionController],
  providers: [
    QuestionService, 
    AdminGuard, 
    RedisStreamsListeners, 
    QuestionAssignmentService,
    CollaborationClient,
  ],
})
export class QuestionModule {}
