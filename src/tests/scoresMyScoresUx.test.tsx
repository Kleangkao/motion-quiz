import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ScoresPage } from '@/routes/ScoresPage';
import { fetchMyRecordedScores } from '@/leaderboard/leaderboardClient';
import { getResultSession } from '@/storage/resultStorage';
import { getMostRecentPhotoMomentMintForSession } from '@/storage/photoMomentNftStorage';
import type { RecordedScoreRow } from '@/leaderboard/types';

const WALLET = 'Wallet111111111111111111111111111111111111111';

vi.mock('@/solana/WalletProvider', () => ({
  useWallet: () => ({
    address: WALLET,
    connecting: false,
    error: null,
    supportsTransactions: true,
    requestConnect: vi.fn(),
    sendTransaction: vi.fn(),
    signMessage: vi.fn(),
  }),
  shortenAddress: (addr: string | null | undefined) => addr?.slice(0, 6) ?? '—',
}));

vi.mock('@/solana/env', () => ({
  isSupabaseConfigured: () => true,
  getSolanaCluster: () => 'devnet',
}));

vi.mock('@/leaderboard/leaderboardClient', () => ({
  fetchTopicLeaderboard: vi.fn().mockResolvedValue({ ok: true, rows: [] }),
  fetchMyRecordedScores: vi.fn(),
  leaderboardErrorMessage: (error: string) => error,
}));

vi.mock('@/leaderboard/leaderboardTopics', () => ({
  loadLeaderboardTopicOptions: vi.fn().mockResolvedValue([
    { packId: 'islanddao-challenge', title: 'IslandDAO Challenge', packContentHash: 'hash-a' },
  ]),
  resolveLeaderboardPackId: () => 'islanddao-challenge',
}));

vi.mock('@/storage/resultStorage', () => ({
  getResultSession: vi.fn(),
}));

vi.mock('@/storage/photoMomentNftStorage', () => ({
  getMostRecentPhotoMomentMintForSession: vi.fn(() => null),
}));

const scoreRow: RecordedScoreRow = {
  id: 'score-1',
  walletAddress: WALLET,
  walletShort: 'Wallet',
  cluster: 'devnet',
  packId: 'islanddao-challenge',
  packTitle: 'IslandDAO Challenge',
  packContentHash: 'hash-a',
  score: 5,
  total: 5,
  accuracy: 100,
  durationMs: 120000,
  sessionId: 'session-local',
  resultHash: 'result-hash',
  txSignature: '4H3gL3sujbpWwY2ZyNYELy5WxScUMq3yCQvyCQxX8bFFjePtWagcGTvTah8rLj8R3jdQ7mavR6xMcBk2nRyWzGtb',
  slot: null,
  blockTime: null,
  createdAt: '2026-06-17T12:00:00.000Z',
};

function renderMyScores() {
  return render(
    <MemoryRouter initialEntries={['/scores?tab=my-scores']}>
      <Routes>
        <Route path="/scores" element={<ScoresPage />} />
        <Route
          path="/play/:lessonId/result/:sessionId"
          element={<div data-testid="result-page">Result loaded</div>}
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('My Scores View Result UX', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchMyRecordedScores).mockResolvedValue({ ok: true, rows: [scoreRow] });
    vi.mocked(getMostRecentPhotoMomentMintForSession).mockReturnValue(null);
  });

  it('shows View Result when local IndexedDB session exists', async () => {
    vi.mocked(getResultSession).mockResolvedValue({
      id: 'session-local',
      lessonId: 'islanddao-challenge',
      lessonTitle: 'IslandDAO Challenge',
      startedAt: '2026-01-01T00:00:00.000Z',
      endedAt: '2026-01-01T00:05:00.000Z',
      durationSeconds: 300,
      score: 5,
      correctCount: 5,
      wrongCount: 0,
      skippedCount: 0,
      totalAnswered: 5,
      accuracy: 100,
      questionResults: [],
    });

    renderMyScores();

    expect(await screen.findByRole('button', { name: 'View Result' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Tx' })).toBeInTheDocument();
  });

  it('navigates to result route when View Result is clicked', async () => {
    vi.mocked(getResultSession).mockResolvedValue({
      id: 'session-local',
      lessonId: 'islanddao-challenge',
      lessonTitle: 'IslandDAO Challenge',
      startedAt: '2026-01-01T00:00:00.000Z',
      endedAt: '2026-01-01T00:05:00.000Z',
      durationSeconds: 300,
      score: 5,
      correctCount: 5,
      wrongCount: 0,
      skippedCount: 0,
      totalAnswered: 5,
      accuracy: 100,
      questionResults: [],
    });

    renderMyScores();

    fireEvent.click(await screen.findByRole('button', { name: 'View Result' }));

    expect(await screen.findByTestId('result-page')).toBeInTheDocument();
  });

  it('shows unavailable copy when local result session is missing', async () => {
    vi.mocked(getResultSession).mockResolvedValue(undefined);

    renderMyScores();

    expect(
      await screen.findByText('Result unavailable on this device'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'View Result' })).toBeNull();
    expect(screen.getByRole('link', { name: 'Tx' })).toBeInTheDocument();
  });

  it('shows View NFT when a local mint record exists', async () => {
    vi.mocked(getResultSession).mockResolvedValue(undefined);
    vi.mocked(getMostRecentPhotoMomentMintForSession).mockReturnValue({
      sessionId: 'session-local',
      photoIndex: 0,
      walletAddress: WALLET,
      packId: 'islanddao-challenge',
      cluster: 'devnet',
      mintAddress: 'Mint111111111111111111111111111111111111111',
      txSignature: 'tx-nft',
      metadataUri: 'https://example.com/meta.json',
      imageUri: 'https://example.com/image.png',
      createdAt: '2026-01-01T00:00:00.000Z',
    });

    renderMyScores();

    const nftLink = await screen.findByRole('link', { name: 'View NFT' });
    expect(nftLink.getAttribute('href')).toContain('Mint111111111111111111111111111111111111111');
    expect(nftLink.getAttribute('href')).toContain('cluster=devnet');
  });
});

describe('Leaderboard View Result guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not show View Result on leaderboard rows', async () => {
    const { fetchTopicLeaderboard } = await import('@/leaderboard/leaderboardClient');
    vi.mocked(fetchTopicLeaderboard).mockResolvedValue({
      ok: true,
      rows: [
        {
          id: 'row-1',
          rank: 1,
          walletAddress: WALLET,
          walletShort: 'Wallet',
          cluster: 'devnet',
          packId: 'islanddao-challenge',
          packTitle: 'IslandDAO Challenge',
          packContentHash: 'hash-a',
          score: 5,
          total: 5,
          accuracy: 100,
          durationMs: 120000,
          sessionId: 'session-1',
          resultHash: 'result-hash',
          txSignature: '4H3gL3sujbpWwY2ZyNYELy5WxScUMq3yCQvyCQxX8bFFjePtWagcGTvTah8rLj8R3jdQ7mavR6xMcBk2nRyWzGtb',
          slot: null,
          blockTime: null,
          createdAt: '2026-06-17T12:00:00.000Z',
        },
      ],
    });

    render(
      <MemoryRouter initialEntries={['/scores?pack=islanddao-challenge']}>
        <Routes>
          <Route path="/scores" element={<ScoresPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Tx' })).toBeInTheDocument();
    });
    expect(screen.queryByRole('button', { name: 'View Result' })).toBeNull();
    expect(screen.queryByText('Result unavailable on this device')).toBeNull();
  });
});
