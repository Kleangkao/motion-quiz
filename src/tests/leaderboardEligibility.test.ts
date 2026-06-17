import { describe, expect, it } from 'vitest';
import { isLeaderboardEligiblePack, LEADERBOARD_ELIGIBLE_PACK_IDS } from '@/solana/leaderboardEligibility';

describe('leaderboard eligibility', () => {
  it('includes featured built-in packs', () => {
    for (const packId of LEADERBOARD_ELIGIBLE_PACK_IDS) {
      expect(isLeaderboardEligiblePack(packId)).toBe(true);
    }
  });

  it('excludes custom topic ids', () => {
    expect(isLeaderboardEligiblePack('a1b2c3d4e5f6789012345678')).toBe(false);
    expect(isLeaderboardEligiblePack('my-custom-topic')).toBe(false);
  });

  it('excludes retired built-in packs', () => {
    expect(isLeaderboardEligiblePack('starter_places_at_school')).toBe(false);
  });
});
