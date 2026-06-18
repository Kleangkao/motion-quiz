import type { SolanaCluster } from '@shared/scoreReceipt';
import type { RecordedScoreReceipt } from '@/storage/scoreRecordStorage';
import { preparePhotoMomentNftAssets } from '@/nft/nftStorage';
import {
  buildPhotoMomentMintTransaction,
  partialSignPhotoMomentMint,
} from '@/nft/photoMomentMint';
import type { PhotoMomentMintResult } from '@/nft/types';
import { getSolanaAppConfig } from '@/solana/solanaConfig';
import type { LessonPack, ResultSession } from '@/storage/types';

export function validateMintPrerequisites(params: {
  walletAddress: string | null;
  photoDataUrl: string | null;
  recordedScore: RecordedScoreReceipt | null;
  sessionId: string;
  cluster: SolanaCluster;
}):
  | { ok: true; recordedScore: RecordedScoreReceipt }
  | { ok: false; message: string } {
  if (!params.walletAddress) {
    return { ok: false, message: 'Connect wallet to mint.' };
  }
  if (!params.photoDataUrl) {
    return { ok: false, message: 'No Photo Moment is available to mint.' };
  }
  if (!params.recordedScore?.verified || !params.recordedScore.txSignature) {
    return { ok: false, message: 'Record this score on Solana first.' };
  }
  if (params.recordedScore.sessionId !== params.sessionId) {
    return { ok: false, message: 'Record this score on Solana first.' };
  }
  if (params.recordedScore.cluster !== params.cluster) {
    return {
      ok: false,
      message: 'Recorded score cluster does not match the configured Solana cluster.',
    };
  }
  return { ok: true, recordedScore: params.recordedScore };
}

export async function mintPhotoMomentNft(params: {
  session: ResultSession;
  lesson: LessonPack;
  walletAddress: string;
  photoDataUrl: string;
  photoIndex: number;
  recordedScore: RecordedScoreReceipt;
  sendTransaction: (transaction: import('@solana/web3.js').Transaction) => Promise<string>;
  onProgress?: (phase: 'uploading' | 'minting') => void;
}): Promise<PhotoMomentMintResult> {
  const configResult = getSolanaAppConfig();
  if (!configResult.ok) {
    throw new Error(configResult.message);
  }
  if (!configResult.config.nftMintingEnabled) {
    throw new Error('Photo Moment NFT minting is disabled in this environment.');
  }

  const cluster = configResult.config.cluster;
  if (params.recordedScore.cluster !== cluster) {
    throw new Error('Recorded score cluster does not match the configured Solana cluster.');
  }

  params.onProgress?.('uploading');
  const assets = await preparePhotoMomentNftAssets({
    cluster,
    packId: params.lesson.id,
    packTitle: params.lesson.title,
    sessionId: params.session.id,
    walletAddress: params.walletAddress,
    score: params.session.score,
    total: params.session.totalAnswered,
    accuracy: params.session.accuracy,
    durationMs: Math.round(params.session.durationSeconds * 1000),
    scoreReceiptTx: params.recordedScore.txSignature,
    capturedAt: params.session.endedAt,
    photoIndex: params.photoIndex,
    imageUrl: '',
    externalUrl: configResult.config.appUrl,
    dataUrl: params.photoDataUrl,
  });

  if (!assets.ok) {
    throw new Error(assets.message);
  }

  params.onProgress?.('minting');
  const plan = await buildPhotoMomentMintTransaction({
    walletAddress: params.walletAddress,
    metadataUri: assets.assets.metadataUrl,
    cluster,
    rpcUrl: configResult.config.rpcUrl,
  });

  const signed = partialSignPhotoMomentMint(plan);
  const txSignature = await params.sendTransaction(signed);

  return {
    txSignature,
    mintAddress: plan.mintAddress,
    metadataUri: assets.assets.metadataUrl,
    imageUri: assets.assets.imageUrl,
    cluster,
  };
}
