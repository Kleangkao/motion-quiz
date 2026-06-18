import { useMemo, useState } from 'react';
import { useWallet, shortenAddress } from '@/solana/WalletProvider';
import { getSolanaAppConfig, clusterLabel } from '@/solana/solanaConfig';
import { solanaExplorerAddressUrl, solanaExplorerTxUrl } from '@/solana/explorer';
import { mintPhotoMomentNft, validateMintPrerequisites } from '@/nft/photoMomentNftClient';
import type { RecordedScoreReceipt } from '@/storage/scoreRecordStorage';
import {
  getPhotoMomentNftRecord,
  savePhotoMomentNftRecord,
} from '@/storage/photoMomentNftStorage';
import type { LessonPack, ResultSession } from '@/storage/types';
import { defaultPhotoIndex } from '@/utils/composeResultMoment';

interface Props {
  session: ResultSession;
  lesson: LessonPack | null;
  sessionPhotos: string[];
  recordedScore: RecordedScoreReceipt | null;
}

type MintUiState =
  | 'idle'
  | 'preparing'
  | 'uploading'
  | 'minting'
  | 'error';

export function PhotoMomentNftPanel({
  session,
  lesson,
  sessionPhotos,
  recordedScore,
}: Props) {
  const {
    address,
    connecting,
    requestConnect,
    sendTransaction,
    supportsTransactions,
  } = useWallet();

  const configResult = useMemo(() => getSolanaAppConfig(), []);
  const cluster = configResult.ok ? configResult.config.cluster : 'devnet';
  const clusterText = configResult.ok ? configResult.config.clusterLabel : clusterLabel('devnet');

  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(() =>
    defaultPhotoIndex(sessionPhotos.length),
  );
  const [mintState, setMintState] = useState<MintUiState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [mintRefresh, setMintRefresh] = useState(0);

  const selectedPhoto = sessionPhotos[selectedPhotoIndex] ?? null;

  const minted = useMemo(() => {
    void mintRefresh;
    if (!address) return null;
    return getPhotoMomentNftRecord({
      cluster,
      walletAddress: address,
      sessionId: session.id,
      photoIndex: selectedPhotoIndex,
    });
  }, [address, cluster, session.id, selectedPhotoIndex, mintRefresh]);

  if (!configResult.ok) {
    return (
      <div className="glass-card p-5 space-y-2">
        <h3 className="font-bold text-white">Photo Moment NFT</h3>
        <p className="text-xs text-white/50 leading-relaxed">{configResult.message}</p>
      </div>
    );
  }

  if (!configResult.config.nftMintingEnabled) {
    return (
      <div className="glass-card p-5 space-y-2">
        <h3 className="font-bold text-white">Photo Moment NFT</h3>
        <p className="text-xs text-white/50 leading-relaxed">
          Photo Moment NFT minting is not enabled in this environment.
        </p>
      </div>
    );
  }

  if (sessionPhotos.length === 0) {
    return null;
  }

  const description =
    configResult.config.isProductionCluster
      ? 'Mint one Photo Moment from this session on Solana.'
      : `Mint one Photo Moment from this session on ${clusterText}.`;

  const prereq = validateMintPrerequisites({
    walletAddress: address,
    photoDataUrl: selectedPhoto,
    recordedScore,
    sessionId: session.id,
    cluster,
  });

  const handleMint = async () => {
    if (!address || !lesson || !selectedPhoto || mintState === 'minting' || mintState === 'preparing') {
      return;
    }
    const check = validateMintPrerequisites({
      walletAddress: address,
      photoDataUrl: selectedPhoto,
      recordedScore,
      sessionId: session.id,
      cluster,
    });
    if (!check.ok) {
      setError(check.message);
      setMintState('error');
      return;
    }

    setError(null);
    setMintState('preparing');

    try {
      setMintState('uploading');
      const result = await mintPhotoMomentNft({
        session,
        lesson,
        walletAddress: address,
        photoDataUrl: selectedPhoto,
        photoIndex: selectedPhotoIndex,
        recordedScore: check.recordedScore,
        sendTransaction,
        onProgress: (phase) => setMintState(phase === 'uploading' ? 'uploading' : 'minting'),
      });

      savePhotoMomentNftRecord({
        sessionId: session.id,
        photoIndex: selectedPhotoIndex,
        walletAddress: address,
        packId: lesson.id,
        cluster: result.cluster,
        mintAddress: result.mintAddress,
        txSignature: result.txSignature,
        metadataUri: result.metadataUri,
        imageUri: result.imageUri,
        createdAt: new Date().toISOString(),
      });

      setMintRefresh((value) => value + 1);
      setMintState('idle');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setMintState('error');
    }
  };

  const showMinted = Boolean(minted);

  return (
    <div className="glass-card p-5 space-y-4">
      <div>
        <h3 className="font-bold text-white">Photo Moment NFT</h3>
        <p className="text-xs text-white/50 mt-1 leading-relaxed">{description}</p>
        <p className="text-xs text-white/40 mt-1">
          Mints the selected Photo Moment — not the result card. This NFT uses the score receipt from this session.
        </p>
      </div>

      {sessionPhotos.length > 1 && !showMinted && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {sessionPhotos.map((url, index) => (
            <button
              key={`nft-photo-${index}`}
              type="button"
              onClick={() => setSelectedPhotoIndex(index)}
              className={`aspect-square rounded-xl overflow-hidden border-2 transition-colors ${
                selectedPhotoIndex === index
                  ? 'border-indigo-400'
                  : 'border-white/20 hover:border-indigo-400/60'
              }`}
            >
              <img src={url} alt={`Photo moment ${index + 1}`} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {showMinted && minted ? (
        <div className="rounded-xl bg-green-500/10 border border-green-500/30 p-4 space-y-3">
          <p className="text-green-400 font-semibold text-sm">Minted on {clusterText}</p>
          <p className="text-xs text-white/50 font-mono break-all">
            Mint: {shortenAddress(minted.mintAddress, 8)}
          </p>
          <div className="flex flex-col gap-2">
            <a
              href={solanaExplorerAddressUrl(minted.mintAddress, minted.cluster)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary btn-sm w-full text-xs"
            >
              View mint on Explorer
            </a>
            <a
              href={solanaExplorerTxUrl(minted.txSignature, minted.cluster)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary btn-sm w-full text-xs"
            >
              View transaction
            </a>
            <a
              href={minted.metadataUri}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary btn-sm w-full text-xs"
            >
              View metadata
            </a>
          </div>
        </div>
      ) : !address ? (
        <div className="space-y-3">
          <p className="text-xs text-white/50">
            Connect wallet and record your score to unlock minting.
          </p>
          <button onClick={() => requestConnect().catch(() => {})} disabled={connecting} className="btn btn-primary btn-lg w-full">
            {connecting ? 'Connecting…' : 'Connect Wallet'}
          </button>
        </div>
      ) : !supportsTransactions ? (
        <p className="text-xs text-amber-300/90">This wallet cannot send mint transactions yet.</p>
      ) : !prereq.ok ? (
        <p className="text-xs text-white/50">{prereq.message}</p>
      ) : (
        <div className="space-y-3">
          <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-3">
            <p className="text-xs text-white/45 mb-1">Connected wallet</p>
            <p className="text-sm text-white font-mono">{shortenAddress(address, 6)}</p>
          </div>
          <button
            type="button"
            onClick={handleMint}
            disabled={!lesson || mintState === 'minting' || mintState === 'uploading' || mintState === 'preparing'}
            className="btn btn-primary btn-lg w-full"
          >
            {mintState === 'preparing'
              ? 'Preparing photo…'
              : mintState === 'uploading'
                ? 'Uploading metadata…'
                : mintState === 'minting'
                  ? `Minting on ${clusterText}…`
                  : 'Mint Photo Moment NFT'}
          </button>
          {!lesson && <p className="text-xs text-white/45">Loading topic details…</p>}
        </div>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
