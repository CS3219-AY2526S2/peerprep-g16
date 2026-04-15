import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type SessionStateDocument = HydratedDocument<SessionState>;

@Schema()
export class SessionState {
  @Prop({ required: true, unique: true, index: true })
  sessionId: string;

  @Prop({ required: true })
  user1Id: string;

  @Prop({ required: true })
  user2Id: string;

  @Prop()
  questionId?: string;

  @Prop()
  language?: string;

  @Prop()
  code?: string;

  @Prop({ default: 0 })
  hintsUsed: number;

  @Prop({ default: 0 })
  testCasesPassed: number;

  @Prop({ type: Object })
  whiteboardState?: Record<string, unknown>;

  @Prop({ enum: ['active', 'ended'], default: 'active' })
  status: string;

  @Prop({ required: true })
  startedAt: Date;

  @Prop()
  endedAt?: Date;

  @Prop({ default: false })
  publishedToStream: boolean;

  @Prop({ default: Date.now })
  lastSavedAt: Date;

  @Prop({ default: Date.now })
  createdAt: Date;
}

export const SessionStateSchema = SchemaFactory.createForClass(SessionState);

// TTL index: auto-expire documents 4 hours after creation
SessionStateSchema.index({ createdAt: 1 }, { expireAfterSeconds: 4 * 60 * 60 });
