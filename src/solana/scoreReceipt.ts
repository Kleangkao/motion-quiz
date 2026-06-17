/**
 * Frontend-facing re-exports for score receipt helpers.
 * Canonical implementation lives in supabase/functions/_shared/scoreReceipt.ts.
 */
export {
  SCORE_RECEIPT_APP,
  SCORE_RECEIPT_TYPE,
  SCORE_RECEIPT_VERSION,
  MEMO_PROGRAM_ID,
  canonicalizePackContent,
  computePackContentHash,
  computeResultHash,
  normalizeAccuracyPercent,
  parseScoreReceiptMemo,
  resultTotalFromSession,
  scoreReceiptMatchesExpected,
  serializeScoreReceiptPayload,
  shortenWalletAddress,
  validateExpectedInput,
  validateScoreReceiptFields,
  type PackContentForHash,
  type ResultHashInput,
  type ScoreReceiptExpected,
  type ScoreReceiptPayload,
  type SolanaCluster,
} from '@shared/scoreReceipt';

import type { LessonPack } from '@/storage/types';
import type { ResultSession } from '@/storage/types';
import type { PackContentForHash, ResultHashInput, ScoreReceiptExpected, ScoreReceiptPayload, SolanaCluster } from '@shared/scoreReceipt';
import {
  SCORE_RECEIPT_APP,
  SCORE_RECEIPT_TYPE,
  SCORE_RECEIPT_VERSION,
  computePackContentHash,
  computeResultHash,
  normalizeAccuracyPercent,
  resultTotalFromSession,
} from '@shared/scoreReceipt';

export function lessonPackToPackContentForHash(lesson: LessonPack): PackContentForHash {
  return {
    id: lesson.id,
    title: lesson.title,
    schemaVersion: lesson.schemaVersion,
    questions: lesson.questions.map((question) => ({
      id: question.id,
      prompt: question.prompt,
      correctSide: question.correctSide,
      left: {
        id: question.left.id,
        ...(question.left.label !== undefined ? { label: question.left.label } : {}),
        ...(question.left.image?.value !== undefined ? { imageValue: question.left.image.value } : {}),
      },
      right: {
        id: question.right.id,
        ...(question.right.label !== undefined ? { label: question.right.label } : {}),
        ...(question.right.image?.value !== undefined ? { imageValue: question.right.image.value } : {}),
      },
    })),
  };
}

export async function computePackContentHashFromLesson(lesson: LessonPack): Promise<string> {
  return computePackContentHash(lessonPackToPackContentForHash(lesson));
}

export interface BuildScoreReceiptInput {
  cluster: SolanaCluster;
  lesson: LessonPack;
  packContentHash: string;
  sessionId: string;
  walletAddress: string;
  score: number;
  totalAnswered: number;
  skippedCount: number;
  durationMs: number;
}

export async function buildScoreReceiptPayload(
  input: BuildScoreReceiptInput,
): Promise<ScoreReceiptPayload> {
  const total = resultTotalFromSession(input.totalAnswered, input.skippedCount);
  const accuracy = normalizeAccuracyPercent(input.score, total);
  const resultHash = await computeResultHash({
    sessionId: input.sessionId,
    packId: input.lesson.id,
    packContentHash: input.packContentHash,
    walletAddress: input.walletAddress,
    score: input.score,
    total,
    accuracy,
    durationMs: input.durationMs,
  } satisfies ResultHashInput);

  return {
    app: SCORE_RECEIPT_APP,
    type: SCORE_RECEIPT_TYPE,
    version: SCORE_RECEIPT_VERSION,
    cluster: input.cluster,
    packId: input.lesson.id,
    packTitle: input.lesson.title,
    packContentHash: input.packContentHash,
    sessionId: input.sessionId,
    walletAddress: input.walletAddress,
    score: input.score,
    total,
    accuracy,
    durationMs: input.durationMs,
    resultHash,
  };
}

export function scoreReceiptExpectedFromPayload(payload: ScoreReceiptPayload): ScoreReceiptExpected {
  return {
    cluster: payload.cluster,
    walletAddress: payload.walletAddress,
    packId: payload.packId,
    packTitle: payload.packTitle,
    packContentHash: payload.packContentHash,
    sessionId: payload.sessionId,
    score: payload.score,
    total: payload.total,
    accuracy: payload.accuracy,
    durationMs: payload.durationMs,
    resultHash: payload.resultHash,
  };
}

export async function buildScoreReceiptFromSession(
  lesson: LessonPack,
  session: ResultSession,
  walletAddress: string,
  cluster: SolanaCluster,
): Promise<ScoreReceiptPayload> {
  const packContentHash = await computePackContentHashFromLesson(lesson);
  return buildScoreReceiptPayload({
    cluster,
    lesson,
    packContentHash,
    sessionId: session.id,
    walletAddress,
    score: session.score,
    totalAnswered: session.totalAnswered,
    skippedCount: session.skippedCount,
    durationMs: session.durationSeconds * 1000,
  });
}
