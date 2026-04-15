// apps/question-service/src/feedback/feedback.module.ts

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Feedback, FeedbackSchema } from './schemas/feedback.schema';
import { FeedbackController } from './feedback.controller';
import { FeedbackService } from './feedback.service';

/**
 * Feature module for feedback management.
 * Registers the Feedback schema, controller, and service.
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Feedback.name, schema: FeedbackSchema },
    ]),
  ],
  controllers: [FeedbackController],
  providers: [FeedbackService],
})
export class FeedbackModule {}
