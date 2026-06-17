import { FEATURED_PLAY_PACK_IDS } from '@/storage/seedLessons';

/**
 * Built-in featured packs are eligible for the global topic leaderboard.
 * Custom user topics and retired built-ins are excluded in v1.
 */
export function isLeaderboardEligiblePack(packId: string): boolean {
  return (FEATURED_PLAY_PACK_IDS as readonly string[]).includes(packId);
}

export const LEADERBOARD_ELIGIBLE_PACK_IDS = [...FEATURED_PLAY_PACK_IDS] as const;
