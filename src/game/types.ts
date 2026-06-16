import type { QuizQuestion, QuizChoice, InputMethod } from '@/storage/types';
import type { PhotoResumeMode } from './sessionPhotoSchedule';

export type GameStatus =
  | 'idle'
  | 'playing'
  | 'feedback'
  | 'photo-capture'
  | 'paused'
  | 'finished';

export interface ActiveQuestion {
  question: QuizQuestion;
  questionIndex: number;
  startedAtMs: number;
}

export interface FeedbackState {
  selectedSide: 'left' | 'right';
  isCorrect: boolean;
  correctChoice: QuizChoice;
  inputMethod: InputMethod;
}

export interface GameState {
  status: GameStatus;
  lessonId: string;
  lessonTitle: string;
  durationSeconds: number;
  remainingMs: number;
  score: number;
  correctCount: number;
  wrongCount: number;
  skippedCount: number;
  totalAnswered: number;
  questionQueue: QuizQuestion[];
  currentIndex: number;
  activeQuestion: ActiveQuestion | null;
  feedback: FeedbackState | null;
  sessionId: string;
  startedAt: string;
}

export type GameAction =
  | { type: 'START'; payload: { questions: QuizQuestion[]; lessonId: string; lessonTitle: string; durationSeconds: number; sessionId: string; startedAt: string } }
  | { type: 'TICK'; payload: { elapsedMs: number } }
  | { type: 'SUBMIT_ANSWER'; payload: { side: 'left' | 'right'; inputMethod: InputMethod } }
  | { type: 'NEXT_QUESTION' }
  | { type: 'START_PHOTO_CAPTURE' }
  | { type: 'END_PHOTO_CAPTURE'; payload?: { mode?: PhotoResumeMode } }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'END' }
  | { type: 'SKIP' };
