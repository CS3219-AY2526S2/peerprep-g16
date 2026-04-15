import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

/**
 * Mongoose document type for Question records.
 * Used when interacting with the Question model in services.
 */
export type QuestionDocument = HydratedDocument<Question>;

/**
 * Represents an example shown to users in the problem statement.
 * Stored as an embedded subdocument without its own MongoDB _id.
 */
@Schema({ _id: false })
export class Example {
  @Prop({ required: true, type: MongooseSchema.Types.Mixed })
  input: any;

  @Prop({ required: true, type: MongooseSchema.Types.Mixed })
  output: any;

  @Prop()
  explanation?: string;
}

export const ExampleSchema = SchemaFactory.createForClass(Example);

/**
 * Represents a test case used for validating submitted solutions.
 * Stored as an embedded subdocument without its own MongoDB _id.
 */
@Schema({ _id: false })
export class TestCase {
  @Prop({ required: true, type: MongooseSchema.Types.Mixed })
  input: any;

  @Prop({ required: true, type: MongooseSchema.Types.Mixed })
  expectedOutput: any;
}

export const TestCaseSchema = SchemaFactory.createForClass(TestCase);

/**
 * Main schema for coding questions stored in the question bank.
 * Includes metadata, examples, hints, and both sample and hidden test cases.
 */
@Schema({ timestamps: true })
export class Question {
  @Prop({ required: true, unique: true, trim: true })
  questionId: string;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({
    required: true,
    type: [{ type: String, trim: true }],
    index: true,
    validate: [
      (val: string[]) => val.length > 0,
      'At least one topic is required',
    ],
  })
  topic: string[];

  @Prop({
    required: true,
    enum: ['Easy', 'Medium', 'Hard'],
    index: true,
  })
  difficulty: string;

  @Prop({ required: true })
  description: string;

  @Prop({ type: [String], default: [] })
  constraints: string[];

  @Prop({ type: [ExampleSchema], default: [] })
  examples: Example[];

  @Prop({ type: [String], default: [] })
  hints: string[];

  @Prop({
    type: {
      sample: {
        type: [TestCaseSchema],
        required: true,
        validate: [
          (val: TestCase[]) => val.length > 0,
          'At least one sample test case is required',
        ],
        default: undefined,
      },
      hidden: {
        type: [TestCaseSchema],
        default: [],
      },
    },
    required: true,
  })
  testCases: {
    sample: TestCase[];
    hidden: TestCase[];
  };

  @Prop ({ required: true })
  modelAnswer: string;

  @Prop ({required: true})
  modelAnswerTimeComplexity: string;

  @Prop ({required: true})
  modelAnswerExplanation: string;
}

export const QuestionSchema = SchemaFactory.createForClass(Question);

/**
 * Compound index to speed up the common retrieval query
 * by topic and difficulty.
 */
QuestionSchema.index({ topic: 1, difficulty: 1 });
