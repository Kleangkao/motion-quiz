import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { RecordedScoreReceipt } from '@/storage/scoreRecordStorage';
import type { ResultSession } from '@/storage/types';

const sessionFixture: ResultSession = {
  id: 'session-wiring',
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

const receiptFixture: RecordedScoreReceipt = {
  sessionId: 'session-wiring',
  txSignature: 'tx-wiring',
  verified: true,
  cluster: 'devnet',
  packId: 'islanddao-challenge',
  packContentHash: 'hash',
  recordedAt: '2026-01-01T00:00:00.000Z',
};

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useParams: () => ({ lessonId: 'islanddao-challenge', sessionId: 'session-wiring' }),
    useNavigate: () => vi.fn(),
    useLocation: () => ({ state: { sessionPhotos: ['data:image/jpeg;base64,abc'] } }),
  };
});

vi.mock('@/storage/resultStorage', () => ({
  getResultSession: vi.fn().mockResolvedValue(sessionFixture),
}));

vi.mock('@/storage/lessonStorage', () => ({
  getLesson: vi.fn().mockResolvedValue({
    id: 'islanddao-challenge',
    schemaVersion: 1,
    title: 'IslandDAO Challenge',
    durationSeconds: 300,
    questionOrder: 'sequential',
    showAnswerTextAfterResponse: true,
    allowTouchFallback: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    questions: [],
  }),
}));

vi.mock('@/storage/scoreRecordStorage', () => ({
  getRecordedScore: vi.fn(() => null),
}));

vi.mock('@/components/layout/PageLayout', () => ({
  PageLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/result/GameMomentPanel', () => ({
  GameMomentPanel: () => null,
}));

let latestRecordedScore: RecordedScoreReceipt | null = null;

vi.mock('@/components/result/PhotoMomentNftPanel', () => ({
  PhotoMomentNftPanel: ({ recordedScore }: { recordedScore: RecordedScoreReceipt | null }) => {
    latestRecordedScore = recordedScore;
    return (
      <div data-testid="nft-panel">{recordedScore ? 'nft-unlocked' : 'nft-locked'}</div>
    );
  },
}));

vi.mock('@/components/result/SolanaScorePanel', () => ({
  SolanaScorePanel: ({
    onScoreRecorded,
  }: {
    onScoreRecorded?: (record: RecordedScoreReceipt) => void;
  }) => (
    <button type="button" onClick={() => onScoreRecorded?.(receiptFixture)}>
      mock-record-score
    </button>
  ),
}));

describe('ResultPage score receipt wiring', () => {
  it('updates NFT panel after SolanaScorePanel records a score', async () => {
    const { ResultPage } = await import('@/routes/ResultPage');

    render(<ResultPage />);

    expect(await screen.findByTestId('nft-panel')).toHaveTextContent('nft-locked');

    fireEvent.click(screen.getByRole('button', { name: 'mock-record-score' }));

    expect(latestRecordedScore).toEqual(receiptFixture);
    expect(screen.getByTestId('nft-panel')).toHaveTextContent('nft-unlocked');
  });
});
