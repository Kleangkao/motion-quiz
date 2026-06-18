import type { SolanaCluster } from '@shared/scoreReceipt';

export const NFT_ASSETS_BUCKET = 'motion-quiz-nft-assets';
export const NFT_SYMBOL = 'MQPM';
export const NFT_DISPLAY_NAME = 'Motion Quiz Photo Moment';

export interface PhotoMomentMetadataInput {
  cluster: SolanaCluster;
  packId: string;
  packTitle: string;
  sessionId: string;
  walletAddress: string;
  score: number;
  total: number;
  accuracy: number;
  durationMs: number | null;
  scoreReceiptTx: string | null;
  capturedAt: string;
  photoIndex: number;
  imageUrl: string;
  externalUrl: string | null;
}

export interface PhotoMomentMetadataJson {
  name: string;
  symbol: string;
  description: string;
  image: string;
  external_url?: string;
  attributes: Array<{ trait_type: string; value: string | number }>;
}

export interface PreparedPhotoMomentAssets {
  imagePath: string;
  metadataPath: string;
  imageUrl: string;
  metadataUrl: string;
  metadata: PhotoMomentMetadataJson;
}

export interface PhotoMomentMintResult {
  txSignature: string;
  mintAddress: string;
  metadataUri: string;
  imageUri: string;
  cluster: SolanaCluster;
}

export interface StoredPhotoMomentNft {
  sessionId: string;
  photoIndex: number;
  walletAddress: string;
  packId: string;
  cluster: SolanaCluster;
  mintAddress: string;
  txSignature: string;
  metadataUri: string;
  imageUri: string;
  createdAt: string;
}

export type NftClientErrorCode =
  | 'not_configured'
  | 'wallet_missing'
  | 'photo_missing'
  | 'score_missing'
  | 'cluster_mismatch'
  | 'upload_failed'
  | 'mint_failed'
  | 'already_minted';
