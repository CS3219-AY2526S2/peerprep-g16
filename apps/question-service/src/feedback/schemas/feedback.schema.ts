import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type FeedbackDocument = HydratedDocument<Feedback>;

@Schema({ timestamps: true })
export class Feedback {
  @Prop({ required: true })
  questionId!: string;

  @Prop({ required: true })
  userId!: string;

  @Prop({
    required: true,
    enum: [
      'unclear_wording',
      'wrong_difficulty',
      'insufficient_test_cases',
      'other',
    ],
  })
  category!: string;

  @Prop({ required: true, trim: true, maxlength: 1000 })
  comment!: string;

  @Prop({
    enum: ['pending', 'reviewed', 'resolved'],
    default: 'pending',
  })
  status!: string;

  @Prop({ trim: true, maxlength: 500, default: '' })
  adminNote!: string;
}

export const FeedbackSchema = SchemaFactory.createForClass(Feedback);

FeedbackSchema.index({ status: 1 });
FeedbackSchema.index({ questionId: 1 });
FeedbackSchema.index({ userId: 1 });
