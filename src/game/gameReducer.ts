import type { GameState, GameAction, ActiveQuestion } from './types';
import type { QuizQuestion } from '@/storage/types';
import { scoreForAnswer } from './scoring';

export function createInitialGameState(): GameState {
  return {
    status: 'idle',
    lessonId: '',
    lessonTitle: '',
    durationSeconds: 120,
    remainingMs: 120000,
    score: 0,
    correctCount: 0,
    wrongCount: 0,
    skippedCount: 0,
    totalAnswered: 0,
    questionQueue: [],
    currentIndex: 0,
    activeQuestion: null,
    feedback: null,
    sessionId: '',
    startedAt: '',
  };
}

function makeActiveQuestion(
  question: QuizQuestion,
  index: number,
): ActiveQuestion {
  return { question, questionIndex: index, startedAtMs: performance.now() };
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'START': {
      const { questions, lessonId, lessonTitle, durationSeconds, sessionId, startedAt } =
        action.payload;
      return {
        ...createInitialGameState(),
        status: 'playing',
        lessonId,
        lessonTitle,
        durationSeconds,
        remainingMs: durationSeconds * 1000,
        questionQueue: questions,
        currentIndex: 0,
        activeQuestion: questions.length > 0 ? makeActiveQuestion(questions[0], 0) : null,
        sessionId,
        startedAt,
      };
    }

    case 'TICK': {
      if (state.status !== 'playing') return state;
      const remaining = state.remainingMs - action.payload.elapsedMs;
      if (remaining <= 0) {
        return { ...state, remainingMs: 0, status: 'finished' };
      }
      return { ...state, remainingMs: remaining };
    }

    case 'SUBMIT_ANSWER': {
      if (state.status !== 'playing' || !state.activeQuestion) return state;
      const { side, inputMethod } = action.payload;
      const { question } = state.activeQuestion;
      const isCorrect = side === question.correctSide;
      const score = state.score + scoreForAnswer(isCorrect);
      const correctCount = state.correctCount + (isCorrect ? 1 : 0);
      const wrongCount = state.wrongCount + (isCorrect ? 0 : 1);
      const correctChoice = side === 'left' ? question.left : question.right;

      return {
        ...state,
        status: 'feedback',
        score,
        correctCount,
        wrongCount,
        totalAnswered: state.totalAnswered + 1,
        feedback: {
          selectedSide: side,
          isCorrect,
          correctChoice,
          inputMethod,
        },
      };
    }

    case 'START_PHOTO_CAPTURE': {
      if (state.status !== 'feedback') return state;
      return { ...state, status: 'photo-capture' };
    }

    case 'END_PHOTO_CAPTURE': {
      if (state.status !== 'photo-capture') return state;
      const nextIndex = state.currentIndex + 1;
      if (nextIndex >= state.questionQueue.length) {
        return { ...state, status: 'finished', feedback: null };
      }
      return {
        ...state,
        status: 'playing',
        currentIndex: nextIndex,
        activeQuestion: makeActiveQuestion(state.questionQueue[nextIndex], nextIndex),
        feedback: null,
      };
    }

    case 'NEXT_QUESTION': {
      if (state.status !== 'feedback') return state;
      const nextIndex = state.currentIndex + 1;
      if (nextIndex >= state.questionQueue.length) {
        return { ...state, status: 'finished', feedback: null };
      }
      return {
        ...state,
        status: 'playing',
        currentIndex: nextIndex,
        activeQuestion: makeActiveQuestion(state.questionQueue[nextIndex], nextIndex),
        feedback: null,
      };
    }

    case 'SKIP': {
      if (state.status !== 'playing' || !state.activeQuestion) return state;
      const nextIndex = state.currentIndex + 1;
      if (nextIndex >= state.questionQueue.length) {
        return { ...state, status: 'finished', skippedCount: state.skippedCount + 1 };
      }
      return {
        ...state,
        skippedCount: state.skippedCount + 1,
        currentIndex: nextIndex,
        activeQuestion: makeActiveQuestion(state.questionQueue[nextIndex], nextIndex),
      };
    }

    case 'PAUSE': {
      if (state.status !== 'playing') return state;
      return { ...state, status: 'paused' };
    }

    case 'RESUME': {
      if (state.status !== 'paused') return state;
      return { ...state, status: 'playing' };
    }

    case 'END': {
      return { ...state, status: 'finished', remainingMs: 0 };
    }

    default:
      return state;
  }
}
