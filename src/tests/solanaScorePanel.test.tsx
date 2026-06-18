import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SolanaScorePanel } from '@/components/result/SolanaScorePanel';
import type { LessonPack, ResultSession } from '@/storage/types';

const requestConnect = vi.fn().mockResolvedValue(undefined);

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

vi.mock('@/solana/WalletProvider', () => ({
  useWallet: () => ({
    address: null,
    connecting: false,
    error: null,
    supportsTransactions: true,
    requestConnect,
    sendTransaction: vi.fn(),
    signMessage: vi.fn(),
  }),
  shortenAddress: (addr: string | null | undefined) => addr ?? '—',
}));

vi.mock('@/solana/env', () => ({
  isSupabaseConfigured: () => true,
  getSolanaCluster: () => 'devnet',
}));

vi.mock('@/storage/scoreRecordStorage', () => ({
  getRecordedScore: () => null,
  saveRecordedScore: vi.fn(),
}));

const baseSession: ResultSession = {
  id: 'session-1',
  lessonId: 'islanddao-challenge',
  lessonTitle: 'IslandDAO Challenge',
  startedAt: '2026-01-01T00:00:00.000Z',
  endedAt: '2026-01-01T00:05:00.000Z',
  durationSeconds: 300,
  score: 80,
  correctCount: 8,
  wrongCount: 2,
  skippedCount: 0,
  totalAnswered: 10,
  accuracy: 80,
  questionResults: [],
};

describe('SolanaScorePanel', () => {
  beforeEach(() => {
    requestConnect.mockClear();
  });

  it('shows one connect action when disconnected on eligible packs', () => {
    render(
      <SolanaScorePanel
        session={baseSession}
        lesson={lessonFixture}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Solana Score' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Connect Wallet' })).toHaveLength(1);
    expect(screen.queryByRole('button', { name: 'Record Score on Solana' })).toBeNull();
  });

  it('shows custom topic ineligible message without record action', () => {
    render(
      <SolanaScorePanel
        session={{ ...baseSession, lessonId: 'my-custom-topic' }}
        lesson={{ ...lessonFixture, id: 'my-custom-topic', title: 'Custom' }}
      />,
    );

    expect(screen.getByText('Leaderboard is available for built-in topics only.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Connect Wallet' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Record Score on Solana' })).toBeNull();
  });
});

describe('SolanaScorePanel connected states', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('uses cluster-aware copy for mainnet configuration', async () => {
    vi.doMock('@/solana/env', () => ({
      isSupabaseConfigured: () => true,
      getSolanaCluster: () => 'mainnet-beta',
    }));
    vi.doMock('@/solana/WalletProvider', () => ({
      useWallet: () => ({
        address: null,
        connecting: false,
        error: null,
        supportsTransactions: true,
        requestConnect,
        sendTransaction: vi.fn(),
        signMessage: vi.fn(),
      }),
      shortenAddress: (addr: string | null | undefined) => addr ?? '—',
    }));
    vi.doMock('@/storage/scoreRecordStorage', () => ({
      getRecordedScore: () => null,
      saveRecordedScore: vi.fn(),
    }));

    const { SolanaScorePanel: Panel } = await import('@/components/result/SolanaScorePanel');

    render(
      <Panel
        session={baseSession}
        lesson={lessonFixture}
      />,
    );

    expect(screen.getByText(/Record this score on Solana mainnet/)).toBeInTheDocument();
  });

  it('shows unsupported wallet message without crashing', async () => {
    vi.doMock('@/solana/WalletProvider', () => ({
      useWallet: () => ({
        address: 'ConnectedWallet1111111111111111111111111',
        connecting: false,
        error: null,
        supportsTransactions: false,
        requestConnect,
        sendTransaction: vi.fn(),
        signMessage: vi.fn(),
      }),
      shortenAddress: (addr: string) => addr.slice(0, 6),
    }));

    const { SolanaScorePanel: Panel } = await import('@/components/result/SolanaScorePanel');

    render(
      <Panel
        session={baseSession}
        lesson={lessonFixture}
      />,
    );

    expect(screen.getByText('This wallet cannot record scores yet.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Record Score on Solana' })).toBeNull();
  });
});
