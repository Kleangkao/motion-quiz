import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  fetchMyRecordedScores,
  fetchMyScoresForTopic,
  fetchTopicLeaderboard,
  leaderboardErrorMessage,
} from '@/leaderboard/leaderboardClient';

vi.mock('@/solana/env', () => ({
  isSupabaseConfigured: () => true,
  getSupabaseUrl: () => 'https://example.supabase.co',
  getSupabaseAnonKey: () => 'anon-key-placeholder',
}));

const sampleRow = {
  id: 'row-1',
  wallet_address: 'Wallet1111111111111111111111111111111',
  wallet_short: 'Wallet11',
  cluster: 'devnet',
  pack_id: 'islanddao-challenge',
  pack_title: 'IslandDAO Challenge',
  pack_content_hash: 'pack-hash-abc',
  score: 5,
  total: 5,
  accuracy: 100,
  duration_ms: 120000,
  session_id: 'session-1',
  result_hash: 'result-hash',
  tx_signature: '4H3gL3sujbpWwY2ZyNYELy5WxScUMq3yCQvyCQxX8bFFjePtWagcGTvTah8rLj8R3jdQ7mavR6xMcBk2nRyWzGtb',
  slot: 123,
  block_time: '2026-06-17T12:00:00.000Z',
  created_at: '2026-06-17T12:00:01.000Z',
};

describe('leaderboardClient', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('fetchTopicLeaderboard filters cluster, pack_id, and pack_content_hash', async () => {
    const fetchMock = vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify([sampleRow]), { status: 200 }),
    );

    const result = await fetchTopicLeaderboard({
      packId: 'islanddao-challenge',
      packContentHash: 'pack-hash-abc',
      cluster: 'devnet',
      limit: 25,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0]?.rank).toBe(1);
      expect(result.rows[0]?.score).toBe(5);
    }

    const [url] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).toContain('motion_quiz_topic_leaderboard');
    expect(String(url)).toContain('cluster=eq.devnet');
    expect(String(url)).toContain('pack_id=eq.islanddao-challenge');
    expect(String(url)).toContain('pack_content_hash=eq.pack-hash-abc');
    expect(String(url)).toContain('limit=25');
  });

  it('fetchMyRecordedScores filters wallet and cluster', async () => {
    const fetchMock = vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify([sampleRow]), { status: 200 }),
    );

    const result = await fetchMyRecordedScores({
      walletAddress: 'Wallet1111111111111111111111111111111',
      cluster: 'devnet',
    });

    expect(result.ok).toBe(true);
    const [url] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).toContain('motion_quiz_scores');
    expect(String(url)).toContain('wallet_address=eq.Wallet1111111111111111111111111111111');
    expect(String(url)).toContain('cluster=eq.devnet');
  });

  it('fetchMyScoresForTopic adds topic filters', async () => {
    const fetchMock = vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify([sampleRow]), { status: 200 }),
    );

    await fetchMyScoresForTopic({
      walletAddress: 'Wallet1111111111111111111111111111111',
      packId: 'islanddao-challenge',
      packContentHash: 'pack-hash-abc',
      cluster: 'devnet',
    });

    const [url] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).toContain('pack_id=eq.islanddao-challenge');
    expect(String(url)).toContain('pack_content_hash=eq.pack-hash-abc');
  });

  it('returns empty rows for blank wallet without calling fetch', async () => {
    const result = await fetchMyRecordedScores({
      walletAddress: '   ',
      cluster: 'devnet',
    });

    expect(result).toEqual({ ok: true, rows: [] });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('maps client errors to readable messages', () => {
    expect(leaderboardErrorMessage('not_configured')).toContain('not configured');
    expect(leaderboardErrorMessage('network')).toContain('Could not load leaderboard');
  });
});
