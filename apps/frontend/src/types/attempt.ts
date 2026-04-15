export type Attempt = {
  _id: string;
  questionId: string;
  questionTitle: string;
  topic: string[];
  difficulty: "Easy" | "Medium" | "Hard";
  code?: string;
  collaborationSessionId?: string;
  language?: string;
  hintsUsed?: number;
  testCasesPassed?: number;
  duration?: number;
  whiteboardScreenshot?: {
    type: "Buffer";
    data: number[];
  };
  attemptedAt: string;
};

