import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminGuard } from '../auth/admin.guard';
import { Question, QuestionSchema } from './schemas/question.schema';
import { QuestionController } from './question.controller';
import { QuestionService } from './question.service';
import { HttpModule } from '@nestjs/axios';

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
  ],
})
export class QuestionModule {}
