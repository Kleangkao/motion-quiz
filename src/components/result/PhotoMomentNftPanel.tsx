import { useEffect, useMemo, useRef, useState } from 'react';
import { useWallet, shortenAddress } from '@/solana/WalletProvider';
import { getSolanaAppConfig, clusterLabel } from '@/solana/solanaConfig';
import { solanaExplorerAddressUrl, solanaExplorerTxUrl } from '@/solana/explorer';
import { mintPhotoMomentNft, validateMintPrerequisites } from '@/nft/photoMomentNftClient';
import { formatPhotoMomentMintError } from '@/nft/nftStorage';
import type { RecordedScoreReceipt } from '@/storage/scoreRecordStorage';
import {
  getPhotoMomentNftRecord,
  hasPhotoMomentMintForSession,
  listPhotoMomentMintsForSessionOnCluster,
  savePhotoMomentNftRecord,
} from '@/storage/photoMomentNftStorage';
import type { StoredPhotoMomentNft } from '@/nft/types';
import type { SolanaCluster } from '@shared/scoreReceipt';
import type { LessonPack, ResultSession } from '@/storage/types';
import { defaultPhotoIndex } from '@/utils/composeResultMoment';

/** How long to wait for wallet approve/reject before offering reset (ms). */
export const NFT_WALLET_APPROVAL_TIMEOUT_MS = 75_000;

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

type PhotoMintStatus = 'unminted' | 'minted_own' | 'minted_other';

function initialPhotoIndex(
  sessionId: string,
  cluster: SolanaCluster,
  photoCount: number,
  walletAddress: string | null,
): number {
  if (walletAddress && photoCount > 0) {
    for (let index = 0; index < photoCount; index += 1) {
      if (
        !getPhotoMomentNftRecord({
          cluster,
          walletAddress,
          sessionId,
          photoIndex: index,
        })
      ) {
        return index;
      }
    }
  }
  return defaultPhotoIndex(photoCount);
}

function photoMintStatus(
  cluster: SolanaCluster,
  sessionId: string,
  photoIndex: number,
  walletAddress: string | null,
): PhotoMintStatus {
  if (walletAddress) {
    const own = getPhotoMomentNftRecord({
      cluster,
      walletAddress,
      sessionId,
      photoIndex,
    });
    if (own) return 'minted_own';
  }
  if (hasPhotoMomentMintForSession({ cluster, sessionId, photoIndex })) {
    return 'minted_other';
  }
  return 'unminted';
}

export function PhotoMomentNftPanel({
  session,
  lesson,
  sessionPhotos,
  recordedScore,
}: Props) {
  const {
    address,
    connecting,
    reconnecting,
    requestConnect,
    sendTransaction,
    supportsTransactions,
  } = useWallet();

  const configResult = useMemo(() => getSolanaAppConfig(), []);
  const cluster = configResult.ok ? configResult.config.cluster : 'devnet';
  const clusterText = configResult.ok ? configResult.config.clusterLabel : clusterLabel('devnet');

  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(() =>
    initialPhotoIndex(session.id, cluster, sessionPhotos.length, address),
  );
  const [mintState, setMintState] = useState<MintUiState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [mintRefresh, setMintRefresh] = useState(0);
  const [mintSuccess, setMintSuccess] = useState<StoredPhotoMomentNft | null>(null);
  const [walletApprovalSlow, setWalletApprovalSlow] = useState(false);
  const mintFlowGeneration = useRef(0);

  useEffect(() => {
    if (mintState !== 'minting') {
      setWalletApprovalSlow(false);
      return undefined;
    }

    setWalletApprovalSlow(false);
    const timer = window.setTimeout(() => {
      setWalletApprovalSlow(true);
    }, NFT_WALLET_APPROVAL_TIMEOUT_MS);

    return () => window.clearTimeout(timer);
  }, [mintState]);

  const handleResetMint = () => {
    mintFlowGeneration.current += 1;
    setMintState('idle');
    setWalletApprovalSlow(false);
    setError(null);
  };

  const clusterMints = useMemo(() => {
    void mintRefresh;
    return listPhotoMomentMintsForSessionOnCluster({ cluster, sessionId: session.id });
  }, [cluster, session.id, mintRefresh]);

  const sessionHasAnyMint = clusterMints.length > 0;

  const selectedPhoto = sessionPhotos[selectedPhotoIndex] ?? null;

  const selectedOwnMint = useMemo(() => {
    void mintRefresh;
    if (!address) return null;
    return getPhotoMomentNftRecord({
      cluster,
      walletAddress: address,
      sessionId: session.id,
      photoIndex: selectedPhotoIndex,
    });
  }, [address, cluster, session.id, selectedPhotoIndex, mintRefresh]);

  const selectedStatus = useMemo(() => {
    void mintRefresh;
    return photoMintStatus(cluster, session.id, selectedPhotoIndex, address);
  }, [cluster, session.id, selectedPhotoIndex, address, mintRefresh]);

  const allPhotosMintedByWallet = useMemo(() => {
    void mintRefresh;
    if (!address || sessionPhotos.length === 0) return false;
    return sessionPhotos.every(
      (_, index) =>
        getPhotoMomentNftRecord({
          cluster,
          walletAddress: address,
          sessionId: session.id,
          photoIndex: index,
        }) != null,
    );
  }, [address, cluster, session.id, sessionPhotos, mintRefresh]);

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

  if (sessionPhotos.length === 0 && !sessionHasAnyMint) {
    return null;
  }

  const description =
    configResult.config.isProductionCluster
      ? 'Mint Photo Moments from this session on Solana — one NFT per photo.'
      : `Mint Photo Moments from this session on ${clusterText} — one NFT per photo.`;

  const prereq = validateMintPrerequisites({
    walletAddress: address,
    photoDataUrl: selectedPhoto,
    recordedScore,
    sessionId: session.id,
    cluster,
  });

  const handleMint = async () => {
    if (
      !address ||
      !lesson ||
      !selectedPhoto ||
      selectedStatus !== 'unminted' ||
      mintState === 'minting' ||
      mintState === 'preparing' ||
      mintState === 'uploading'
    ) {
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
    setWalletApprovalSlow(false);
    const generation = mintFlowGeneration.current + 1;
    mintFlowGeneration.current = generation;
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
        onProgress: (phase) => {
          if (mintFlowGeneration.current !== generation) return;
          setMintState(phase === 'uploading' ? 'uploading' : 'minting');
        },
      });

      if (mintFlowGeneration.current !== generation) return;

      const record: StoredPhotoMomentNft = {
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
      };

      savePhotoMomentNftRecord(record);

      setMintRefresh((value) => value + 1);
      setMintState('idle');
      setWalletApprovalSlow(false);
      setMintSuccess(record);
    } catch (e) {
      if (mintFlowGeneration.current !== generation) return;
      setError(formatPhotoMomentMintError(e instanceof Error ? e.message : String(e)));
      setMintState('error');
      setWalletApprovalSlow(false);
    }
  };

  const walletPending = reconnecting || connecting;
  const photosUnavailable = sessionPhotos.length === 0;
  const mintBusy = mintState === 'minting' || mintState === 'uploading' || mintState === 'preparing';

  const activeSuccessBanner =
    mintSuccess && mintSuccess.photoIndex === selectedPhotoIndex ? mintSuccess : null;

  const handleSelectPhoto = (index: number) => {
    setSelectedPhotoIndex(index);
    if (mintSuccess && mintSuccess.photoIndex !== index) {
      setMintSuccess(null);
    }
  };

  const tileBadge = (index: number): string | null => {
    const status = photoMintStatus(cluster, session.id, index, address);
    if (status === 'minted_own') return 'Minted';
    if (status === 'minted_other') return 'Other wallet';
    if (selectedPhotoIndex === index) return 'Selected for NFT';
    return null;
  };

  return (
    <div className="glass-card p-5 space-y-4">
      <div>
        <h3 className="font-bold text-white">Photo Moment NFT</h3>
        <p className="text-xs text-white/50 mt-1 leading-relaxed">{description}</p>
        <p className="text-xs text-white/40 mt-1">
          Each Photo Moment can be minted once. Mints the selected photo — not the result card. Uses
          the score receipt from this session.
        </p>
        {configResult.config.isProductionCluster && (
          <p className="text-xs text-white/40 mt-1 leading-relaxed">
            Mainnet NFT minting creates token and metadata accounts and requires SOL for rent and
            network fees. Wallets may show unknown balance changes for NFT mints.
          </p>
        )}
      </div>

      {activeSuccessBanner && (
        <div
          className="rounded-xl bg-green-500/15 border border-green-500/40 p-3 space-y-2"
          role="status"
          aria-live="polite"
        >
          <p className="text-sm font-semibold text-green-400">Photo Moment minted</p>
          <div className="flex flex-wrap gap-2">
            <a
              href={solanaExplorerAddressUrl(activeSuccessBanner.mintAddress, activeSuccessBanner.cluster)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary btn-sm text-xs"
            >
              View NFT
            </a>
            <a
              href={solanaExplorerTxUrl(activeSuccessBanner.txSignature, activeSuccessBanner.cluster)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary btn-sm text-xs"
            >
              View transaction
            </a>
          </div>
          <button
            type="button"
            onClick={() => setMintSuccess(null)}
            className="text-[11px] text-white/45 hover:text-white/70"
          >
            Dismiss
          </button>
        </div>
      )}
      {photosUnavailable && (
        <div className="space-y-2">
          <p className="text-xs text-white/50 leading-relaxed">
            Photo images from this session are not on this device. Minted Photo Moments below can
            still be viewed on Explorer.
          </p>
          {clusterMints.length > 0 && (
            <ul className="space-y-1 text-xs text-white/45">
              {clusterMints.map((mint) => (
                <li key={`${mint.photoIndex}-${mint.mintAddress}`}>
                  Photo {mint.photoIndex + 1} · {shortenAddress(mint.mintAddress, 6)}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {sessionPhotos.length > 0 && (
        <div className="space-y-2">
          {sessionPhotos.length > 1 && (
            <p className="text-xs font-semibold uppercase tracking-wide text-white/50">
              Choose a photo to mint or view
            </p>
          )}
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {sessionPhotos.map((url, index) => {
              const badge = tileBadge(index);
              const status = photoMintStatus(cluster, session.id, index, address);
              return (
                <button
                  key={`nft-photo-${index}`}
                  type="button"
                  onClick={() => handleSelectPhoto(index)}
                  aria-pressed={selectedPhotoIndex === index}
                  aria-label={`Photo moment ${index + 1}${badge ? `, ${badge}` : ''}`}
                  className={`relative aspect-[4/3] rounded-xl overflow-hidden border-2 transition-colors bg-black/40 ${
                    selectedPhotoIndex === index
                      ? 'border-indigo-400 ring-2 ring-indigo-400/40'
                      : status === 'minted_own'
                        ? 'border-green-500/50'
                        : 'border-white/20 hover:border-indigo-400/60'
                  }`}
                >
                  <img
                    src={url}
                    alt={`Photo moment ${index + 1}`}
                    className="h-full w-full object-contain"
                  />
                  {badge && (
                    <span
                      className={`absolute inset-x-0 bottom-0 py-0.5 text-[10px] font-bold text-white text-center ${
                        status === 'minted_own'
                          ? 'bg-green-600/90'
                          : status === 'minted_other'
                            ? 'bg-amber-600/90'
                            : 'bg-indigo-600/90'
                      }`}
                    >
                      {badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-white/40">NFT uses the full captured photo (4:3 crop).</p>
        </div>
      )}

      {walletPending ? (
        <p className="text-xs text-white/50">Restoring wallet connection…</p>
      ) : !address ? (
        <div className="space-y-3">
          <p className="text-xs text-white/50">
            {sessionHasAnyMint
              ? 'Connect your wallet to view minted Photo Moment NFTs.'
              : 'Connect wallet and record your score to unlock minting.'}
          </p>
          <button
            onClick={() => requestConnect().catch(() => {})}
            disabled={connecting}
            className="btn btn-primary btn-lg w-full"
          >
            {connecting ? 'Connecting…' : 'Connect Wallet'}
          </button>
        </div>
      ) : !supportsTransactions ? (
        <p className="text-xs text-amber-300/90">This wallet cannot send mint transactions yet.</p>
      ) : selectedStatus === 'minted_own' && selectedOwnMint && !activeSuccessBanner ? (
        <div className="space-y-2">
          <p className="text-xs text-green-400/90">This Photo Moment is minted on {clusterText}.</p>
          <a
            href={solanaExplorerAddressUrl(selectedOwnMint.mintAddress, selectedOwnMint.cluster)}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary btn-lg w-full"
          >
            View NFT
          </a>
          <div className="flex flex-col gap-2 sm:flex-row">
            <a
              href={solanaExplorerTxUrl(selectedOwnMint.txSignature, selectedOwnMint.cluster)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary btn-sm flex-1 text-xs"
            >
              View transaction
            </a>
            <a
              href={selectedOwnMint.metadataUri}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary btn-sm flex-1 text-xs"
            >
              View metadata
            </a>
          </div>
          {allPhotosMintedByWallet && (
            <p className="text-xs text-white/40 text-center pt-1">All Photo Moments minted</p>
          )}
        </div>
      ) : selectedStatus === 'minted_other' ? (
        <p className="text-xs text-white/50">
          This Photo Moment was minted from another wallet on this device.
        </p>
      ) : photosUnavailable ? (
        <p className="text-xs text-white/50">
          Minting needs the Photo Moment image. It is not stored on this device.
        </p>
      ) : !prereq.ok ? (
        <p className="text-xs text-white/50">{prereq.message}</p>
      ) : activeSuccessBanner ? null : (
        <div className="space-y-3">
          <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-3">
            <p className="text-xs text-white/45 mb-1">Connected wallet</p>
            <p className="text-sm text-white font-mono">{shortenAddress(address, 6)}</p>
          </div>
          {mintState === 'minting' && !walletApprovalSlow && (
            <p className="text-xs text-white/50 leading-relaxed">
              Wallet opened. Approve or reject the transaction in your wallet.
            </p>
          )}
          {walletApprovalSlow && (
            <div className="space-y-2">
              <p className="text-xs text-amber-300/90 leading-relaxed">
                Wallet approval is taking longer than expected. If your wallet is stuck, close it and
                try again.
              </p>
              <button
                type="button"
                onClick={handleResetMint}
                className="btn btn-secondary btn-sm w-full"
              >
                Reset and try again
              </button>
            </div>
          )}
          <button
            type="button"
            onClick={handleMint}
            disabled={!lesson || mintBusy || selectedStatus !== 'unminted'}
            className="btn btn-primary btn-lg w-full"
          >
            {mintState === 'preparing'
              ? 'Preparing photo…'
              : mintState === 'uploading'
                ? 'Uploading metadata…'
                : mintState === 'minting'
                  ? `Minting on ${clusterText}…`
                  : 'Mint selected Photo Moment'}
          </button>
          {!lesson && <p className="text-xs text-white/45">Loading topic details…</p>}
        </div>
      )}

      {error && mintState !== 'minting' && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
