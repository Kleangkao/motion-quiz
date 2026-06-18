import {
  NFT_DISPLAY_NAME,
  NFT_SYMBOL,
  type PhotoMomentMetadataInput,
  type PhotoMomentMetadataJson,
} from '@/nft/types';
import { clusterShortLabel } from '@/solana/solanaConfig';

export function buildPhotoMomentMetadata(input: PhotoMomentMetadataInput): PhotoMomentMetadataJson {
  const attributes: PhotoMomentMetadataJson['attributes'] = [
    { trait_type: 'app', value: 'Motion Quiz' },
    { trait_type: 'cluster', value: input.cluster },
    { trait_type: 'pack_id', value: input.packId },
    { trait_type: 'pack_title', value: input.packTitle },
    { trait_type: 'score', value: input.score },
    { trait_type: 'total', value: input.total },
    { trait_type: 'accuracy', value: Math.round(input.accuracy) },
    { trait_type: 'wallet', value: input.walletAddress },
    { trait_type: 'photo_index', value: input.photoIndex + 1 },
    { trait_type: 'captured_at', value: input.capturedAt },
  ];

  if (input.durationMs != null) {
    attributes.push({ trait_type: 'duration_ms', value: input.durationMs });
  }
  if (input.scoreReceiptTx) {
    attributes.push({ trait_type: 'score_receipt_tx', value: input.scoreReceiptTx });
  }

  const metadata: PhotoMomentMetadataJson = {
    name: `${NFT_DISPLAY_NAME} (${clusterShortLabel(input.cluster)})`,
    symbol: NFT_SYMBOL,
    description: 'Photo Moment captured during a Motion Quiz session.',
    image: input.imageUrl,
    attributes,
  };

  if (input.externalUrl) {
    metadata.external_url = input.externalUrl;
  }

  return metadata;
}

export function buildStorageObjectPath(params: {
  cluster: string;
  packId: string;
  walletAddress: string;
  sessionId: string;
  photoIndex: number;
  extension: 'png' | 'jpg' | 'json';
}): string {
  const safePack = encodeURIComponent(params.packId);
  const safeWallet = encodeURIComponent(params.walletAddress);
  const safeSession = encodeURIComponent(params.sessionId);
  const fileBase = `photo-${params.photoIndex + 1}`;
  if (params.extension === 'json') {
    return `${params.cluster}/${safePack}/${safeWallet}/${safeSession}/${fileBase}.json`;
  }
  return `${params.cluster}/${safePack}/${safeWallet}/${safeSession}/${fileBase}.${params.extension}`;
}

export function imageExtensionFromDataUrl(dataUrl: string): 'png' | 'jpg' | null {
  if (dataUrl.startsWith('data:image/png')) return 'png';
  if (dataUrl.startsWith('data:image/jpeg') || dataUrl.startsWith('data:image/jpg')) return 'jpg';
  return null;
}

export function dataUrlToBlob(dataUrl: string): Blob | null {
  const extension = imageExtensionFromDataUrl(dataUrl);
  if (!extension) return null;

  const comma = dataUrl.indexOf(',');
  if (comma < 0) return null;

  const header = dataUrl.slice(0, comma);
  const payload = dataUrl.slice(comma + 1);
  const mime = header.replace('data:', '').replace(';base64', '');
  const binary = atob(payload);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}
