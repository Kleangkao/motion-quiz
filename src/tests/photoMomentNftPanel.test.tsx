import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { mintPhotoMomentNft } from '@/nft/photoMomentNftClient';
import { PhotoMomentNftPanel } from '@/components/result/PhotoMomentNftPanel';
import type { RecordedScoreReceipt } from '@/storage/scoreRecordStorage';
import {
  getPhotoMomentNftRecord,
  hasPhotoMomentMintForSession,
  listPhotoMomentMintsForSessionOnCluster,
  savePhotoMomentNftRecord,
} from '@/storage/photoMomentNftStorage';
import type { LessonPack, ResultSession } from '@/storage/types';
import type { StoredPhotoMomentNft } from '@/nft/types';

const WALLET = 'Wallet111111111111111111111111111111111111111';
const requestConnect = vi.fn().mockResolvedValue(undefined);
const sendTransaction = vi.fn();

const useWalletMock = vi.fn(() => ({
  address: WALLET,
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

vi.mock('@/nft/photoMomentNftClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/nft/photoMomentNftClient')>();
  return {
    ...actual,
    mintPhotoMomentNft: vi.fn(),
  };
});

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

const mintRecordPhoto0: StoredPhotoMomentNft = {
  sessionId: 'session-1',
  photoIndex: 0,
  walletAddress: WALLET,
  packId: 'islanddao-challenge',
  cluster: 'devnet',
  mintAddress: 'Mint111111111111111111111111111111111111111',
  txSignature: 'tx-abc',
  metadataUri: 'https://example.com/meta-0.json',
  imageUri: 'https://example.com/image-0.png',
  createdAt: '2026-01-01T00:00:00.000Z',
};

const twoPhotos = ['data:image/jpeg;base64,one', 'data:image/jpeg;base64,two'];

function renderPanel(
  recordedScore: RecordedScoreReceipt | null,
  sessionPhotos: string[] = ['data:image/jpeg;base64,abc'],
) {
  return render(
    <PhotoMomentNftPanel
      session={session}
      lesson={lesson}
      sessionPhotos={sessionPhotos}
      recordedScore={recordedScore}
    />,
  );
}

function mockGetRecord(
  impl: (params: { photoIndex: number; walletAddress: string }) => StoredPhotoMomentNft | null,
) {
  vi.mocked(getPhotoMomentNftRecord).mockImplementation((params) =>
    impl({ photoIndex: params.photoIndex, walletAddress: params.walletAddress }),
  );
}

describe('PhotoMomentNftPanel', () => {
  beforeEach(() => {
    vi.mocked(getPhotoMomentNftRecord).mockReturnValue(null);
    vi.mocked(hasPhotoMomentMintForSession).mockReturnValue(false);
    vi.mocked(listPhotoMomentMintsForSessionOnCluster).mockReturnValue([]);
    vi.mocked(mintPhotoMomentNft).mockReset();
    useWalletMock.mockReturnValue({
      address: WALLET,
      connecting: false,
      reconnecting: false,
      requestConnect,
      sendTransaction,
      supportsTransactions: true,
    });
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
    renderPanel(null);

    expect(document.body.textContent).toContain('Record this score on Solana first.');
    expect(document.body.textContent).not.toContain('Mint selected Photo Moment');
  });

  it('unlocks when current session score receipt is passed in', () => {
    renderPanel(currentReceipt);

    expect(document.body.textContent).toContain('Mint selected Photo Moment');
    expect(document.body.textContent).not.toContain('Record this score on Solana first.');
  });

  it('does not unlock with score receipt from another session', () => {
    renderPanel(otherSessionReceipt);

    expect(document.body.textContent).toContain('Record this score on Solana first.');
    expect(document.body.textContent).not.toContain('Mint selected Photo Moment');
  });

  it('does not unlock with score receipt from another cluster', () => {
    renderPanel(otherClusterReceipt);

    expect(document.body.textContent).toContain(
      'Recorded score cluster does not match the configured Solana cluster.',
    );
    expect(document.body.textContent).not.toContain('Mint selected Photo Moment');
  });

  it('does not show Mint when disconnected but cluster mints exist', () => {
    vi.mocked(listPhotoMomentMintsForSessionOnCluster).mockReturnValue([mintRecordPhoto0]);
    useWalletMock.mockReturnValueOnce({
      address: null,
      connecting: false,
      reconnecting: false,
      requestConnect,
      sendTransaction,
      supportsTransactions: true,
    });

    renderPanel(null, twoPhotos);

    expect(document.body.textContent).toContain('Connect your wallet to view minted Photo Moment NFTs.');
    expect(document.body.textContent).not.toContain('Mint selected Photo Moment');
  });

  it('shows View NFT for minted selected photo and keeps picker visible', () => {
    mockGetRecord(({ photoIndex }) => (photoIndex === 0 ? mintRecordPhoto0 : null));

    renderPanel(currentReceipt, twoPhotos);

    const buttons = Array.from(document.querySelectorAll('button[aria-label^="Photo moment"]'));
    fireEvent.click(buttons[0]!);

    expect(document.body.textContent).toContain('View NFT');
    expect(document.body.textContent).not.toContain('Mint selected Photo Moment');
    expect(buttons).toHaveLength(2);
    expect(document.body.textContent).toContain('Minted');
  });

  it('allows minting photo 2 after photo 1 is minted', () => {
    mockGetRecord(({ photoIndex }) => (photoIndex === 0 ? mintRecordPhoto0 : null));

    renderPanel(currentReceipt, twoPhotos);

    const buttons = Array.from(document.querySelectorAll('button[aria-label^="Photo moment"]'));
    fireEvent.click(buttons[1]!);

    expect(document.body.textContent).toContain('Mint selected Photo Moment');
    expect(document.body.textContent).not.toContain('All Photo Moments minted');
  });

  it('shows wrong-wallet message when selected photo minted by another wallet', () => {
    vi.mocked(hasPhotoMomentMintForSession).mockImplementation(
      ({ photoIndex }) => photoIndex === 0,
    );
    mockGetRecord(() => null);

    renderPanel(currentReceipt, twoPhotos);

    const buttons = Array.from(document.querySelectorAll('button[aria-label^="Photo moment"]'));
    fireEvent.click(buttons[0]!);

    expect(document.body.textContent).toContain('minted from another wallet');
    expect(document.body.textContent).not.toContain('Mint selected Photo Moment');
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
    expect(document.body.textContent).not.toContain('Mint selected Photo Moment');
  });

  it('shows honest copy when photos are missing and session is not minted', () => {
    const { container } = renderPanel(currentReceipt, []);
    expect(container.firstChild).toBeNull();
  });

  it('shows photo picker and selected label for multiple photos', () => {
    renderPanel(currentReceipt, [
      'data:image/jpeg;base64,one',
      'data:image/jpeg;base64,two',
      'data:image/jpeg;base64,three',
    ]);

    expect(document.body.textContent).toContain('Selected for NFT');
    expect(document.body.textContent).toContain('NFT uses the full captured photo');
    expect(document.body.textContent).toContain('Mint selected Photo Moment');
  });

  it('changes selected photo when thumbnail is clicked', () => {
    renderPanel(currentReceipt, twoPhotos);

    const buttons = Array.from(document.querySelectorAll('button[aria-label^="Photo moment"]'));
    expect(buttons).toHaveLength(2);
    fireEvent.click(buttons[1]!);
    expect(buttons[1]?.getAttribute('aria-pressed')).toBe('true');
  });

  it('calls mint with selected photo index and shows success toast', async () => {
    vi.mocked(mintPhotoMomentNft).mockResolvedValue({
      txSignature: 'tx-mint',
      mintAddress: 'Mint222222222222222222222222222222222222222',
      metadataUri: 'https://example.com/meta.json',
      imageUri: 'https://example.com/image.png',
      cluster: 'devnet',
    });

    renderPanel(currentReceipt, twoPhotos);

    const buttons = Array.from(document.querySelectorAll('button[aria-label^="Photo moment"]'));
    fireEvent.click(buttons[1]!);

    fireEvent.click(
      Array.from(document.querySelectorAll('button')).find((btn) =>
        btn.textContent?.includes('Mint selected Photo Moment'),
      )!,
    );

    await waitFor(() => {
      expect(mintPhotoMomentNft).toHaveBeenCalledWith(
        expect.objectContaining({
          photoIndex: 1,
          photoDataUrl: 'data:image/jpeg;base64,two',
        }),
      );
    });

    expect(document.body.textContent).toContain('Photo Moment minted');
    expect(savePhotoMomentNftRecord).toHaveBeenCalledWith(
      expect.objectContaining({ photoIndex: 1 }),
    );
    expect(document.querySelectorAll('button[aria-label^="Photo moment"]')).toHaveLength(2);
    expect(screen.getAllByRole('link', { name: 'View NFT' })).toHaveLength(1);
    expect(screen.queryByRole('link', { name: 'View metadata' })).toBeNull();
    expect(document.body.textContent).not.toContain('This Photo Moment is minted');
  });

  it('shows normal minted actions after dismissing success banner', async () => {
    vi.mocked(mintPhotoMomentNft).mockResolvedValue({
      txSignature: 'tx-mint',
      mintAddress: 'Mint222222222222222222222222222222222222222',
      metadataUri: 'https://example.com/meta.json',
      imageUri: 'https://example.com/image.png',
      cluster: 'devnet',
    });
    vi.mocked(savePhotoMomentNftRecord).mockImplementation((record) => {
      vi.mocked(getPhotoMomentNftRecord).mockImplementation(({ photoIndex, walletAddress }) =>
        photoIndex === record.photoIndex && walletAddress === record.walletAddress ? record : null,
      );
    });

    renderPanel(currentReceipt, twoPhotos);

    const buttons = Array.from(document.querySelectorAll('button[aria-label^="Photo moment"]'));
    fireEvent.click(buttons[1]!);
    fireEvent.click(
      Array.from(document.querySelectorAll('button')).find((btn) =>
        btn.textContent?.includes('Mint selected Photo Moment'),
      )!,
    );

    await waitFor(() => {
      expect(document.body.textContent).toContain('Photo Moment minted');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));

    expect(screen.queryByText('Photo Moment minted')).toBeNull();
    expect(screen.getAllByRole('link', { name: 'View NFT' })).toHaveLength(1);
    expect(screen.getByRole('link', { name: 'View metadata' })).toBeInTheDocument();
    expect(document.body.textContent).toContain('This Photo Moment is minted');
  });

  it('dismisses success banner when selecting another unminted photo', async () => {
    vi.mocked(mintPhotoMomentNft).mockResolvedValue({
      txSignature: 'tx-mint',
      mintAddress: 'Mint222222222222222222222222222222222222222',
      metadataUri: 'https://example.com/meta.json',
      imageUri: 'https://example.com/image.png',
      cluster: 'devnet',
    });
    vi.mocked(savePhotoMomentNftRecord).mockImplementation((record) => {
      vi.mocked(getPhotoMomentNftRecord).mockImplementation(({ photoIndex, walletAddress }) =>
        photoIndex === record.photoIndex && walletAddress === record.walletAddress ? record : null,
      );
    });

    renderPanel(currentReceipt, twoPhotos);

    const buttons = Array.from(document.querySelectorAll('button[aria-label^="Photo moment"]'));
    fireEvent.click(buttons[1]!);
    fireEvent.click(
      Array.from(document.querySelectorAll('button')).find((btn) =>
        btn.textContent?.includes('Mint selected Photo Moment'),
      )!,
    );

    await waitFor(() => {
      expect(document.body.textContent).toContain('Photo Moment minted');
    });

    fireEvent.click(buttons[0]!);

    expect(screen.queryByText('Photo Moment minted')).toBeNull();
    expect(document.body.textContent).toContain('Mint selected Photo Moment');
  });

  it('shows normal minted state without banner when remounted with existing mint record', () => {
    mockGetRecord(({ photoIndex }) => (photoIndex === 0 ? mintRecordPhoto0 : null));

    renderPanel(currentReceipt, twoPhotos);

    const buttons = Array.from(document.querySelectorAll('button[aria-label^="Photo moment"]'));
    fireEvent.click(buttons[0]!);

    expect(screen.queryByText('Photo Moment minted')).toBeNull();
    expect(screen.getByRole('link', { name: 'View metadata' })).toBeInTheDocument();
    expect(document.body.textContent).toContain('This Photo Moment is minted');
  });

  it('does not offer Mint when selected photo is already minted', () => {
    mockGetRecord(({ photoIndex }) => (photoIndex === 0 ? mintRecordPhoto0 : null));

    renderPanel(currentReceipt, twoPhotos);

    const buttons = Array.from(document.querySelectorAll('button[aria-label^="Photo moment"]'));
    fireEvent.click(buttons[0]!);

    expect(document.body.textContent).toContain('View NFT');
    expect(document.body.textContent).not.toContain('Mint selected Photo Moment');
    expect(mintPhotoMomentNft).not.toHaveBeenCalled();
  });

  it('shows All Photo Moments minted when every photo is minted by wallet', () => {
    mockGetRecord(() => mintRecordPhoto0);

    renderPanel(currentReceipt, ['data:image/jpeg;base64,only']);

    expect(document.body.textContent).toContain('All Photo Moments minted');
    expect(document.body.textContent).toContain('View NFT');
    expect(document.body.textContent).not.toContain('Mint selected Photo Moment');
  });
});
