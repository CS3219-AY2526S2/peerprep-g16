import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const AttemptModelSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'UserModel',
      required: true,
    },
    questionId: {
      type: String,
      required: true,
    },
    questionTitle: {
      type: String,
    },
    topic: {
      type: [String],
      default: [],
    },
    difficulty: {
      type: String,
      enum: ['Easy', 'Medium', 'Hard'],
    },
    collaborationSessionId: {
      type: String,
    },
    partnerId: {
      type: Schema.Types.ObjectId,
      ref: 'UserModel',
    },
    language: {
      type: String,
    },
    hintsUsed: {
      type: Number,
      default: 0,
    },
    testCasesPassed: {
      type: Number,
      default: 0,
    },
    duration: {
      type: Number, // milliseconds
    },
    whiteboardScreenshot: {
      type: Buffer,
      contentType: String,
    },
    attemptedAt: {
      type: Date,
      default: Date.now,
    },
    code: {
      type: String,
      default: '',
    },
  },
  { timestamps: true },
);

export default mongoose.model('AttemptModel', AttemptModelSchema);
