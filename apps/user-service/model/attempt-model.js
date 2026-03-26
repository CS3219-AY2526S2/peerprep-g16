import mongoose from "mongoose";

const Schema = mongoose.Schema;

const AttemptModelSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "UserModel",
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
      type: String,
    },
    difficulty: {
      type: String,
      enum: ["Easy", "Medium", "Hard"],
    },
    collaborationSessionId: {
      type: String,
    },
    partnerId: {
      type: Schema.Types.ObjectId,
      ref: "UserModel",
    },
    attemptedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export default mongoose.model("AttemptModel", AttemptModelSchema);