import api from "./axiosInstance";

export type Question = {
  questionId: string;
  title: string;
  topic: string[];
  difficulty: "Easy" | "Medium" | "Hard";
  description: string;
  constraints: string[];
  examples?: {
    input: unknown;
    output: unknown;
    explanation?: string;
  }[];
  hints: string[];
  testCases: {
    sample: {
      input: string;
      expectedOutput: string;
    }[];
    hidden: {
      input: string;
      expectedOutput: string;
    }[];
  };
};

const QUESTION_SERVICE_URL = import.meta.env.VITE_QUESTION_SERVICE_URL;

export async function fetchQuestion(questionId: string): Promise<Question> {
  const response = await api.get<Question>(
    `${QUESTION_SERVICE_URL}/questions/${questionId}`,
  );

  return response.data;
}
