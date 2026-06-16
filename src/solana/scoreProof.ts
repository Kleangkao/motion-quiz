import bs58 from 'bs58';
import type { ResultSession, ScoreProof } from '@/storage/types';

export function buildScoreProofMessage(session: ResultSession): string {
  const challengeName = session.challengeName ?? session.lessonTitle;
  const total = session.totalAnswered + session.skippedCount;
  return [
    'I played Seeker Motion Quiz.',
    `Challenge: ${challengeName}.`,
    `Score: ${session.score}/${Math.max(total, session.questionResults.length)}.`,
    `Accuracy: ${session.accuracy.toFixed(0)}%.`,
    `Timestamp: ${session.endedAt}.`,
    'This signature does not move funds.',
  ].join(' ');
}

export function encodeScoreProof(
  message: string,
  signature: Uint8Array,
  walletAddress: string,
): ScoreProof {
  return {
    message,
    signatureBase58: bs58.encode(signature),
    walletAddress,
    signedAt: new Date().toISOString(),
  };
}
