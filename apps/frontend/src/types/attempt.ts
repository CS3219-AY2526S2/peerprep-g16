export type Attempt = {
  _id: string;
  questionId: string;
  questionTitle: string;
  topic: string[];
  difficulty: "Easy" | "Medium" | "Hard";
  collaborationSessionId?: string;
  attemptedAt: string;
};
