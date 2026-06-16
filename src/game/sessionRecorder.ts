import type { GameState } from './types';
import type { ResultSession, QuestionResult, PlayMode } from '@/storage/types';
import { computeAccuracy } from './scoring';
import { nowIso } from '@/utils/ids';

export interface ResultSessionMeta {
  playMode?: PlayMode;
  challengeId?: string;
  challengeName?: string;
  walletAddress?: string;
}

export function buildResultSession(
  state: GameState,
  questionResults: QuestionResult[],
  approximateFps?: number,
  cameraResolution?: string,
  meta?: ResultSessionMeta,
): ResultSession {
  const endedAt = nowIso();
  const accuracy = computeAccuracy(state.correctCount, state.totalAnswered);

  return {
    id: state.sessionId,
    lessonId: state.lessonId,
    lessonTitle: state.lessonTitle,
    playMode: meta?.playMode,
    challengeId: meta?.challengeId,
    challengeName: meta?.challengeName ?? (meta?.playMode === 'challenge' ? state.lessonTitle : undefined),
    walletAddress: meta?.walletAddress,
    startedAt: state.startedAt,
    endedAt,
    durationSeconds: state.durationSeconds,
    score: state.score,
    correctCount: state.correctCount,
    wrongCount: state.wrongCount,
    skippedCount: state.skippedCount,
    totalAnswered: state.totalAnswered,
    accuracy,
    questionResults,
    deviceInfo: {
      userAgent: navigator.userAgent,
      approximateFps,
      cameraResolution,
    },
  };
}
