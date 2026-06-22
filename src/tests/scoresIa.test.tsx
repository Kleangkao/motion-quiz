import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ScoresPage, SCORES_TOPIC_FILTER_CHIP_CLASS, SCORES_TOPIC_FILTER_ROW_CLASS } from '@/routes/ScoresPage';
import { HomePage } from '@/routes/HomePage';
import { SolanaScorePanel } from '@/components/result/SolanaScorePanel';
import { SoloPlayPage } from '@/routes/SoloPlayPage';
import {
  fetchMyRecordedScores,
  fetchTopicLeaderboard,
} from '@/leaderboard/leaderboardClient';
import type { LessonPack, ResultSession } from '@/storage/types';

vi.mock('@/solana/WalletProvider', () => ({
  useWallet: () => ({
    address: null,
    connecting: false,
    error: null,
    supportsTransactions: true,
    requestConnect: vi.fn(),
    sendTransaction: vi.fn(),
    signMessage: vi.fn(),
  }),
  shortenAddress: (addr: string | null | undefined) => addr ?? '—',
}));

vi.mock('@/solana/env', () => ({
  isSupabaseConfigured: () => true,
  getSolanaCluster: () => 'devnet',
}));

vi.mock('@/leaderboard/leaderboardClient', () => ({
  fetchTopicLeaderboard: vi.fn().mockResolvedValue({ ok: true, rows: [] }),
  fetchMyRecordedScores: vi.fn().mockResolvedValue({ ok: true, rows: [] }),
  leaderboardErrorMessage: (error: string) => error,
}));

vi.mock('@/leaderboard/leaderboardTopics', () => ({
  loadLeaderboardTopicOptions: vi.fn().mockResolvedValue([
    { packId: 'islanddao-challenge', title: 'IslandDAO Challenge', packContentHash: 'hash-a' },
    { packId: 'solana-basics', title: 'Solana Basics', packContentHash: 'hash-b' },
  ]),
  resolveLeaderboardPackId: (requested: string | null, options: { packId: string }[]) => {
    if (requested && options.some((option) => option.packId === requested)) {
      return requested;
    }
    return 'islanddao-challenge';
  },
}));

vi.mock('@/storage/seedLessons', () => ({
  ensureStarterLessons: vi.fn().mockResolvedValue({ insertedIds: [], updatedIds: [] }),
  FEATURED_PLAY_PACK_IDS: [
    'solana-basics',
    'islanddao-challenge',
    'doublezero',
    'play-solana',
    'star-atlas',
    'monkedao',
  ],
  isRetiredBuiltinPack: () => false,
  isVisibleInPlay: () => true,
  isFeaturedPlayPack: () => false,
  playStateForLesson: (lesson: LessonPack) => ({ lesson }),
}));

vi.mock('@/storage/lessonStorage', () => ({
  getLesson: vi.fn().mockResolvedValue(null),
  listLessons: vi.fn().mockResolvedValue([]),
  importLesson: vi.fn(),
  exportLesson: vi.fn(),
}));

vi.mock('@/storage/settingsStorage', () => ({
  getSettings: vi.fn().mockResolvedValue({}),
}));

vi.mock('@/components/wallet/WalletHeaderButton', () => ({
  WalletHeaderButton: () => null,
}));

vi.mock('@/storage/scoreRecordStorage', () => ({
  getRecordedScore: () => ({
    verified: true,
    txSignature: 'tx-signature-123',
  }),
  saveRecordedScore: vi.fn(),
}));

const lessonFixture: LessonPack = {
  id: 'islanddao-challenge',
  schemaVersion: 1,
  title: 'IslandDAO',
  durationSeconds: 300,
  questionOrder: 'sequential',
  showAnswerTextAfterResponse: true,
  allowTouchFallback: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  questions: [],
};

const baseSession: ResultSession = {
  id: 'session-1',
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
};

function renderScoresAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/scores" element={<ScoresPage />} />
        <Route path="/leaderboard" element={<ScoresPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('Scores IA routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Scores page at /scores', async () => {
    renderScoresAt('/scores');
    expect(await screen.findByRole('heading', { name: 'Scores' })).toBeInTheDocument();
  });

  it('renders Scores page at /leaderboard alias', async () => {
    renderScoresAt('/leaderboard');
    expect(await screen.findByRole('heading', { name: 'Scores' })).toBeInTheDocument();
  });

  it('selects My Scores tab from query param', async () => {
    renderScoresAt('/scores?pack=islanddao-challenge&tab=my-scores');
    expect(await screen.findByRole('heading', { name: 'Scores' })).toBeInTheDocument();
    expect(
      screen.getByText('Connect wallet to see your recorded scores.'),
    ).toBeInTheDocument();
  });

  it('shows Leaderboard tab content by default', async () => {
    renderScoresAt('/scores?pack=islanddao-challenge');
    expect(await screen.findByRole('button', { name: 'IslandDAO Challenge' })).toBeInTheDocument();
    expect(await screen.findByText('No recorded scores yet for this topic.')).toBeInTheDocument();
  });
});

describe('ScoresPage leaderboard loading', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchTopicLeaderboard).mockResolvedValue({ ok: true, rows: [] });
    vi.mocked(fetchMyRecordedScores).mockResolvedValue({ ok: true, rows: [] });
  });

  it('does not show empty state before the initial leaderboard fetch completes', async () => {
    let resolveFetch: (value: { ok: true; rows: [] }) => void = () => {};
    const pendingFetch = new Promise<{ ok: true; rows: [] }>((resolve) => {
      resolveFetch = resolve;
    });
    vi.mocked(fetchTopicLeaderboard).mockReturnValue(pendingFetch);

    renderScoresAt('/scores');

    expect(await screen.findByRole('heading', { name: 'Scores' })).toBeInTheDocument();
    expect(await screen.findByText('Loading leaderboard…')).toBeInTheDocument();
    expect(screen.queryByText('No recorded scores yet for this topic.')).toBeNull();

    resolveFetch({ ok: true, rows: [] });

    expect(await screen.findByText('No recorded scores yet for this topic.')).toBeInTheDocument();
  });

  it('fetches IslandDAO Challenge leaderboard on first /scores load', async () => {
    renderScoresAt('/scores');

    await waitFor(() => {
      expect(fetchTopicLeaderboard).toHaveBeenCalledWith(
        expect.objectContaining({
          packId: 'islanddao-challenge',
          packContentHash: 'hash-a',
          cluster: 'devnet',
        }),
      );
    });
  });

  it('fetches default leaderboard from /leaderboard alias', async () => {
    renderScoresAt('/leaderboard');

    await waitFor(() => {
      expect(fetchTopicLeaderboard).toHaveBeenCalledWith(
        expect.objectContaining({
          packId: 'islanddao-challenge',
          packContentHash: 'hash-a',
        }),
      );
    });
  });

  it('renders topic filters in a single horizontal scroll row', async () => {
    renderScoresAt('/scores');

    const islandDao = await screen.findByRole('button', { name: 'IslandDAO Challenge' });
    const filterRow = islandDao.closest("[class*='overflow-x-auto']");

    expect(filterRow).not.toBeNull();
    expect(filterRow?.className).toContain(SCORES_TOPIC_FILTER_ROW_CLASS.split(' ')[0]);
    expect(SCORES_TOPIC_FILTER_ROW_CLASS).toContain('flex-nowrap');
    expect(SCORES_TOPIC_FILTER_ROW_CLASS).toContain('overflow-x-auto');
    expect(SCORES_TOPIC_FILTER_CHIP_CLASS).toContain('shrink-0');
    expect(filterRow?.className).not.toContain('flex-wrap');
  });

  it('falls back to IslandDAO Challenge when pack query is invalid', async () => {
    renderScoresAt('/scores?pack=invalid-pack');

    await waitFor(() => {
      expect(fetchTopicLeaderboard).toHaveBeenCalledWith(
        expect.objectContaining({
          packId: 'islanddao-challenge',
          packContentHash: 'hash-a',
        }),
      );
    });
  });

  it('renders leaderboard rows when fetch returns data', async () => {
    vi.mocked(fetchTopicLeaderboard).mockResolvedValue({
      ok: true,
      rows: [
        {
          id: 'row-1',
          rank: 1,
          walletAddress: 'Wallet1111111111111111111111111111111',
          walletShort: 'Wallet11',
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

    renderScoresAt('/scores?pack=islanddao-challenge&tab=leaderboard');

    expect(await screen.findByRole('link', { name: 'Tx' })).toBeInTheDocument();
    expect(screen.getByText(/5\/5/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'View Result' })).toBeNull();
    expect(screen.queryByText('No recorded scores yet for this topic.')).toBeNull();
  });
});

describe('Home navigation', () => {
  it('shows Start Quiz, Scores, and Settings without separate Results/Leaderboard', async () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('button', { name: /Start Quiz/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Scores/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Settings/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Results$/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Leaderboard$/i })).toBeNull();
  });
});

describe('Play page navigation', () => {
  it('does not show separate Results and Leaderboard global actions', async () => {
    render(
      <MemoryRouter>
        <SoloPlayPage />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Choose a quiz topic', level: 1 })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Results$/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Leaderboard$/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Scores$/i })).toBeNull();
  });
});

describe('SolanaScorePanel recorded link', () => {
  it('points View leaderboard to Scores route with pack and tab params', async () => {
    render(
      <MemoryRouter>
        <SolanaScorePanel session={baseSession} lesson={lessonFixture} />
      </MemoryRouter>,
    );

    const link = await screen.findByRole('link', { name: 'View leaderboard' });
    expect(link.getAttribute('href')).toBe(
      '/scores?pack=islanddao-challenge&tab=leaderboard',
    );
  });
});
