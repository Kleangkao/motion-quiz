import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { PhotoMomentNftPanel } from '@/components/result/PhotoMomentNftPanel';
import type { RecordedScoreReceipt } from '@/storage/scoreRecordStorage';
import {
  getPhotoMomentNftRecord,
  hasPhotoMomentMintForSession,
} from '@/storage/photoMomentNftStorage';
import type { LessonPack, ResultSession } from '@/storage/types';

const requestConnect = vi.fn().mockResolvedValue(undefined);
const sendTransaction = vi.fn();

const useWalletMock = vi.fn(() => ({
  address: 'Wallet111111111111111111111111111111111111111',
  connecting: false,
  reconnecting: false,
  requestConnect,
  sendTransaction,
  supportsTransactions: true,
}));

vi.mock('@/solana/WalletProvider', () => ({
  useWallet: () => useWalletMock(),
  shortenAddress: (addr: string | null | undefined) => addr?.slice(0, 6) ?? '—',
}));

vi.mock('@/solana/solanaConfig', () => ({
  getSolanaAppConfig: () => ({
    ok: true,
    config: {
      cluster: 'devnet',
      rpcUrl: 'https://api.devnet.solana.com',
      clusterLabel: 'Solana devnet',
      isProductionCluster: false,
      scoreRecordingEnabled: true,
      nftMintingEnabled: true,
      supabaseConfigured: true,
      appUrl: null,
    },
  }),
  clusterLabel: (cluster: string) => (cluster === 'mainnet-beta' ? 'Solana mainnet' : 'Solana devnet'),
}));

vi.mock('@/storage/photoMomentNftStorage', () => ({
  getPhotoMomentNftRecord: vi.fn(() => null),
  hasPhotoMomentMintForSession: vi.fn(() => false),
  listPhotoMomentMintsForSessionOnCluster: vi.fn(() => []),
  savePhotoMomentNftRecord: vi.fn(),
}));

const session: ResultSession = {
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

const lesson: LessonPack = {
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
};

const currentReceipt: RecordedScoreReceipt = {
  sessionId: 'session-1',
  txSignature: 'tx-current-session',
  verified: true,
  cluster: 'devnet',
  packId: 'islanddao-challenge',
  packContentHash: 'hash-current',
  recordedAt: '2026-01-01T00:00:00.000Z',
};

const otherSessionReceipt: RecordedScoreReceipt = {
  ...currentReceipt,
  sessionId: 'session-other',
  txSignature: 'tx-other-session',
};

const otherClusterReceipt: RecordedScoreReceipt = {
  ...currentReceipt,
  cluster: 'mainnet-beta',
  txSignature: 'tx-mainnet',
};

function renderPanel(recordedScore: RecordedScoreReceipt | null) {
  return render(
    <PhotoMomentNftPanel
      session={session}
      lesson={lesson}
      sessionPhotos={['data:image/jpeg;base64,abc']}
      recordedScore={recordedScore}
    />,
  );
}

describe('PhotoMomentNftPanel', () => {
  beforeEach(() => {
    vi.mocked(getPhotoMomentNftRecord).mockReturnValue(null);
    vi.mocked(hasPhotoMomentMintForSession).mockReturnValue(false);
  });

  it('prompts to connect wallet when disconnected', () => {
    useWalletMock.mockReturnValueOnce({
      address: null,
      connecting: false,
      reconnecting: false,
      requestConnect,
      sendTransaction,
      supportsTransactions: true,
    });

    renderPanel(null);

    expect(document.body.textContent).toContain('Connect wallet and record your score to unlock minting.');
  });

  it('stays locked with wallet connected but no score receipt', () => {
    useWalletMock.mockReturnValueOnce({
      address: 'Wallet111111111111111111111111111111111111111',
      connecting: false,
      reconnecting: false,
      requestConnect,
      sendTransaction,
      supportsTransactions: true,
    });

    renderPanel(null);

    expect(document.body.textContent).toContain('Record this score on Solana first.');
    expect(document.body.textContent).not.toContain('Mint Photo Moment NFT');
  });

  it('unlocks when current session score receipt is passed in', () => {
    renderPanel(currentReceipt);

    expect(document.body.textContent).toContain('Mint Photo Moment NFT');
    expect(document.body.textContent).not.toContain('Record this score on Solana first.');
  });

  it('does not unlock with score receipt from another session', () => {
    renderPanel(otherSessionReceipt);

    expect(document.body.textContent).toContain('Record this score on Solana first.');
    expect(document.body.textContent).not.toContain('Mint Photo Moment NFT');
  });

  it('does not unlock with score receipt from another cluster', () => {
    renderPanel(otherClusterReceipt);

    expect(document.body.textContent).toContain(
      'Recorded score cluster does not match the configured Solana cluster.',
    );
    expect(document.body.textContent).not.toContain('Mint Photo Moment NFT');
  });

  it('does not show Mint button when disconnected after a session mint exists', () => {
    vi.mocked(hasPhotoMomentMintForSession).mockReturnValue(true);
    useWalletMock.mockReturnValueOnce({
      address: null,
      connecting: false,
      reconnecting: false,
      requestConnect,
      sendTransaction,
      supportsTransactions: true,
    });

    renderPanel(null);

    expect(document.body.textContent).toContain('Connect your wallet to view your minted Photo Moment NFT.');
    expect(document.body.textContent).not.toContain('Mint Photo Moment NFT');
  });

  it('shows minted state when wallet publicKey becomes available', () => {
    vi.mocked(getPhotoMomentNftRecord).mockReturnValue({
      sessionId: 'session-1',
      photoIndex: 0,
      walletAddress: 'Wallet111111111111111111111111111111111111111',
      packId: 'islanddao-challenge',
      cluster: 'devnet',
      mintAddress: 'Mint111111111111111111111111111111111111111',
      txSignature: 'tx-abc',
      metadataUri: 'https://example.com/meta.json',
      imageUri: 'https://example.com/image.png',
      createdAt: '2026-01-01T00:00:00.000Z',
    });

    renderPanel(currentReceipt);

    expect(document.body.textContent).toContain('Minted on Solana devnet');
    expect(document.body.textContent).not.toContain('Mint Photo Moment NFT');
  });

  it('does not show minted state for a different wallet', () => {
    vi.mocked(hasPhotoMomentMintForSession).mockReturnValue(true);
    vi.mocked(getPhotoMomentNftRecord).mockReturnValue(null);

    renderPanel(currentReceipt);

    expect(document.body.textContent).toContain('minted from another wallet');
    expect(document.body.textContent).not.toContain('Mint Photo Moment NFT');
  });

  it('shows reconnecting state instead of Mint button', () => {
    useWalletMock.mockReturnValueOnce({
      address: null,
      connecting: false,
      reconnecting: true,
      requestConnect,
      sendTransaction,
      supportsTransactions: true,
    });

    renderPanel(currentReceipt);

    expect(document.body.textContent).toContain('Restoring wallet connection');
    expect(document.body.textContent).not.toContain('Mint Photo Moment NFT');
  });

  it('initializes unlocked when stored score record is passed for same session', () => {
    renderPanel(currentReceipt);

    expect(document.body.textContent).toContain('Mint Photo Moment NFT');
  });

  it('renders nothing when there are no photos', () => {
    const { container } = render(
      <PhotoMomentNftPanel
        session={session}
        lesson={lesson}
        sessionPhotos={[]}
        recordedScore={currentReceipt}
      />,
    );
    expect(container.firstChild).toBeNull();
  });
});
