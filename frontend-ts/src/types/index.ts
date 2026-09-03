export type Purpose = "Interview" | "Learning";

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Answer {
  question: string;
  answer: string;
  idealAnswer: string;
  feedback: string;
  score: number;
}

export interface Attempt {
  attemptNumber: number;
  totalScore: number;
  isLearning: boolean;
  duration: number;
  answers: Answer[];
  completedAt: string;
}

export interface Interview {
  _id: string;
  userId: string;
  role: string;
  company: string;
  experience: string;
  topic: string;
  difficulty: string;
  purpose: Purpose;
  questions: string[];
  attempts: Attempt[];
  createdAt: string;
  updatedAt: string;
}

export interface LearningQuestion {
  question: string;
  idealAnswer: string;
}

export interface InterviewForm {
  role: string;
  company: string;
  experience: string;
  topic: string;
  difficulty: string;
  count: number;
  purpose: Purpose;
}
