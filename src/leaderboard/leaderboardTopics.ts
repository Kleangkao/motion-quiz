import { ISLANDDAO_CHALLENGE_ID } from '@/data/islanddaoChallengeLesson';
import { LEADERBOARD_ELIGIBLE_PACK_IDS, isLeaderboardEligiblePack } from '@/solana/leaderboardEligibility';
import { computePackContentHashFromLesson } from '@/solana/scoreReceipt';
import { getLesson } from '@/storage/lessonStorage';
import type { LeaderboardTopicOption } from './types';

export const DEFAULT_LEADERBOARD_PACK_ID = ISLANDDAO_CHALLENGE_ID;

export function leaderboardPackIds(): readonly string[] {
  return LEADERBOARD_ELIGIBLE_PACK_IDS;
}

export function isLeaderboardTopicPackId(packId: string): boolean {
  return isLeaderboardEligiblePack(packId);
}

export async function loadLeaderboardTopicOptions(): Promise<LeaderboardTopicOption[]> {
  const options: LeaderboardTopicOption[] = [];

  for (const packId of LEADERBOARD_ELIGIBLE_PACK_IDS) {
    const lesson = await getLesson(packId);
    if (!lesson) continue;
    const packContentHash = await computePackContentHashFromLesson(lesson);
    options.push({
      packId,
      title: lesson.title,
      packContentHash,
    });
  }

  return options;
}

export function resolveLeaderboardPackId(
  requestedPackId: string | null | undefined,
  options: LeaderboardTopicOption[],
): string {
  if (requestedPackId && options.some((option) => option.packId === requestedPackId)) {
    return requestedPackId;
  }
  if (options.some((option) => option.packId === DEFAULT_LEADERBOARD_PACK_ID)) {
    return DEFAULT_LEADERBOARD_PACK_ID;
  }
  return options[0]?.packId ?? DEFAULT_LEADERBOARD_PACK_ID;
}
