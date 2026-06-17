import { describe, expect, it } from 'vitest';
import {
  assignLeaderboardRanks,
  explorerUrlForTx,
  formatAccuracyPercent,
  formatDurationMs,
  formatScoreLine,
  formatWalletDisplay,
} from '@/leaderboard/leaderboardFormat';

describe('leaderboardFormat', () => {
  it('formats score and accuracy', () => {
    expect(formatScoreLine(5, 5)).toBe('5/5');
    expect(formatAccuracyPercent(100)).toBe('100%');
    expect(formatAccuracyPercent(87.5)).toBe('87.5%');
  });

  it('formats duration and wallet display safely', () => {
    expect(formatDurationMs(65000)).toBe('1m 5s');
    expect(formatDurationMs(null)).toBeNull();
    expect(formatWalletDisplay(undefined)).toBe('—');
    expect(formatWalletDisplay('So11111111111111111111111111111111111111112', 4)).toContain('…');
  });

  it('builds devnet explorer links', () => {
    const url = explorerUrlForTx('abc123signature', 'devnet');
    expect(url).toContain('explorer.solana.com/tx/abc123signature');
    expect(url).toContain('cluster=devnet');
  });

  it('assigns display ranks from ordered rows', () => {
    const ranked = assignLeaderboardRanks([
      {
        id: '1',
        walletAddress: 'a',
        walletShort: 'a',
        cluster: 'devnet',
        packId: 'islanddao-challenge',
        packTitle: 'IslandDAO',
        packContentHash: 'hash',
        score: 5,
        total: 5,
        accuracy: 100,
        durationMs: 1000,
        sessionId: 's1',
        resultHash: 'r1',
        txSignature: 'tx1',
        slot: null,
        blockTime: null,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ]);

    expect(ranked[0]?.rank).toBe(1);
  });
});
