/**
 * Example payload shown to users in the problem statement.
 */
export type QuestionExampleDto = {
  input: unknown;
  output: unknown;
  explanation?: string;
};

/**
 * Test case payload used to validate submitted solutions.
 */
export type QuestionTestCaseDto = {
  input: unknown;
  expectedOutput: unknown;
};

/**
 * DTO used when creating a new question in the question bank.
 *
 * This mirrors the persisted question shape expected by the service layer
 * without depending on the Mongoose schema class for request typing.
 */
export type CreateQuestionDto = {
  questionId: string;
  title: string;
  topic: string[];
  difficulty: string;
  description: string;
  constraints: string[];
  examples: QuestionExampleDto[];
  hints: string[];
  testCases: {
    sample: QuestionTestCaseDto[];
    hidden: QuestionTestCaseDto[];
  };
};
