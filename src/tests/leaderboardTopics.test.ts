import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LEADERBOARD_PACK_ID,
  isLeaderboardTopicPackId,
  leaderboardPackIds,
  resolveLeaderboardPackId,
} from '@/leaderboard/leaderboardTopics';

describe('leaderboardTopics', () => {
  it('includes only featured built-in pack ids', () => {
    const ids = leaderboardPackIds();
    expect(ids).toContain('islanddao-challenge');
    expect(ids).toContain('solana-basics');
    expect(ids).not.toContain('my-custom-topic');
  });

  it('excludes custom topics from leaderboard topic ids', () => {
    expect(isLeaderboardTopicPackId('my-custom-topic')).toBe(false);
    expect(isLeaderboardTopicPackId('islanddao-challenge')).toBe(true);
  });

  it('defaults to IslandDAO when available', () => {
    expect(DEFAULT_LEADERBOARD_PACK_ID).toBe('islanddao-challenge');
    expect(
      resolveLeaderboardPackId(null, [
        { packId: 'solana-basics', title: 'Solana Basics', packContentHash: 'a' },
        { packId: 'islanddao-challenge', title: 'IslandDAO', packContentHash: 'b' },
      ]),
    ).toBe('islanddao-challenge');
  });

  it('keeps requested pack when eligible', () => {
    expect(
      resolveLeaderboardPackId('solana-basics', [
        { packId: 'solana-basics', title: 'Solana Basics', packContentHash: 'a' },
        { packId: 'islanddao-challenge', title: 'IslandDAO', packContentHash: 'b' },
      ]),
    ).toBe('solana-basics');
  });
});
