import mongoose, { Schema, Document } from "mongoose";

interface TestCase {
    input: any;
    expectedOutput: any;
}

interface Example {
    input: any;
    expectedOutput: any;
    explanation?: string;
}

export interface QuestionDocument extends Document {
    questionId: string;
    title: string;
    topic: string;
    difficulty: "Easy" | "Medium" | "Hard";
    description: string;
    examples?: Example[];
    hints?: string[];
    testCases: {
        sample: TestCase[];
        hidden: TestCase[];
    }
}

const TestCaseSchema = new Schema<TestCase>(
    {
        input: Schema.Types.Mixed,
        expectedOutput: Schema.Types.Mixed,
    },
    { _id: false }
);

const ExampleSchema = new Schema<Example>(
    {
        input: Schema.Types.Mixed,
        expectedOutput: Schema.Types.Mixed,
        explanation: String,
    },
    { _id: false }
);

const QuestionSchema = new Schema<QuestionDocument>(
    {
        questionId: { type: String, required: true, unique: true },
        title: { type: String, required: true },
        topic: { type: String, required: true, index: true },
        difficulty: { 
            type: String,
            enum: ["Easy", "Medium", "Hard"],
            required: true,
            index: true,
        },
        description: { type: String, required: true },
        examples: [ExampleSchema],
        hints: [String],
        testCases: {
            sample: {
                type: [TestCaseSchema],
                required: true,
                validate: [(v: any[]) => v.length > 0, "At least one sampel testcase required"]
            },
            hidden: {
                type: [TestCaseSchema],
                default: []
            }
        }
    },
    { timestamps: true }
);

export default mongoose.models.Question || mongoose.model<QuestionDocument>("Question", QuestionSchema);