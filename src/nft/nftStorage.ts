import { getSupabaseAnonKey, getSupabaseUrl } from '@/solana/env';
import {
  assertMetadataUriWithinLimit,
  buildPhotoMomentMetadata,
  buildStorageObjectPath,
  dataUrlToBlob,
  imageExtensionFromDataUrl,
} from '@/nft/nftMetadata';
import {
  NFT_ASSETS_BUCKET,
  type PhotoMomentMetadataInput,
  type PreparedPhotoMomentAssets,
} from '@/nft/types';
import { requireSupabaseForNft } from '@/solana/solanaConfig';

function publicObjectUrl(objectPath: string): string | null {
  const base = getSupabaseUrl();
  if (!base) return null;
  return `${base.replace(/\/$/, '')}/storage/v1/object/public/${NFT_ASSETS_BUCKET}/${objectPath}`;
}

function parseJsonObject(value: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function normalizedStatusCode(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && /^\d+$/.test(value)) return Number(value);
  return null;
}

function isDuplicatePayload(obj: Record<string, unknown>): boolean {
  if (normalizedStatusCode(obj.statusCode) === 409) return true;
  if (normalizedStatusCode(obj.httpStatusCode) === 409) return true;
  if (normalizedStatusCode(obj.status) === 409) return true;

  const code = typeof obj.code === 'string' ? obj.code.toLowerCase() : '';
  if (
    code === 'duplicate' ||
    code === 'resourcealreadyexists' ||
    code === 'keyalreadyexists' ||
    code === 'already_exists'
  ) {
    return true;
  }

  const error = typeof obj.error === 'string' ? obj.error.toLowerCase() : '';
  if (error === 'duplicate') return true;

  const message = typeof obj.message === 'string' ? obj.message.toLowerCase() : '';
  if (message.includes('resource already exists') || message.includes('asset already exists')) {
    return true;
  }

  return false;
}

/** Detect Supabase Storage duplicate responses across HTTP/body/error-object shapes. */
export function isStorageDuplicateError(
  error:
    | string
    | Error
    | {
        status?: number;
        statusCode?: number | string;
        httpStatusCode?: number;
        code?: string;
        error?: string;
        message?: string;
      }
    | null
    | undefined,
): boolean {
  if (error == null) return false;

  if (typeof error === 'string') {
    const trimmed = error.trim();
    if (!trimmed) return false;
    const parsed = parseJsonObject(trimmed);
    if (parsed && isDuplicatePayload(parsed)) return true;
    const lower = trimmed.toLowerCase();
    if (lower.includes('resource already exists') || lower.includes('asset already exists')) {
      return true;
    }
    if (lower.includes('"statuscode":"409"') || lower.includes('"statuscode":409')) return true;
    if (lower.includes('"error":"duplicate"')) return true;
    return false;
  }

  if (error instanceof Error) {
    return isStorageDuplicateError(error.message);
  }

  if (typeof error === 'object') {
    if (isDuplicatePayload(error as Record<string, unknown>)) return true;
    if (typeof error.message === 'string' && isStorageDuplicateError(error.message)) return true;
  }

  return false;
}

async function uploadObject(
  objectPath: string,
  body: Blob | string,
  contentType: string,
  upsert: boolean,
): Promise<{ ok: true; reusedExisting?: boolean } | { ok: false; message: string }> {
  const base = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();
  if (!base || !anonKey) {
    return { ok: false, message: 'NFT storage is not configured.' };
  }

  const url = `${base.replace(/\/$/, '')}/storage/v1/object/${NFT_ASSETS_BUCKET}/${objectPath}`;
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        'Content-Type': contentType,
        'x-upsert': upsert ? 'true' : 'false',
      },
      body,
    });
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : String(err) };
  }

  const text = await response.text().catch(() => '');

  if (response.ok) {
    return { ok: true };
  }

  if (response.status === 409 || isStorageDuplicateError(text)) {
    return { ok: true, reusedExisting: true };
  }

  const parsed = parseJsonObject(text);
  if (parsed && isStorageDuplicateError(parsed)) {
    return { ok: true, reusedExisting: true };
  }

  if (response.status === 404) {
    return { ok: false, message: 'NFT storage bucket is missing. Apply the Supabase migration.' };
  }
  if (response.status === 401 || response.status === 403) {
    return { ok: false, message: 'NFT storage upload is not permitted. Check bucket policies.' };
  }
  return { ok: false, message: text || 'Failed to upload NFT asset.' };
}

/** Map raw upload/mint errors to readable copy (never show raw JSON blobs). */
export function formatPhotoMomentMintError(message: string): string {
  const trimmed = message.trim();
  if (!trimmed) return 'NFT mint failed. Please try again.';

  if (/failed to fetch|networkerror|load failed/i.test(trimmed)) {
    return 'Network error while uploading NFT assets. Check your connection and try again.';
  }

  if (trimmed.includes('Duplicate') || trimmed.includes('"statusCode":"409"')) {
    return 'A previous upload was interrupted. Please try minting again.';
  }

  if (/internal error/i.test(trimmed)) {
    return 'Wallet could not send the NFT transaction. Please try again after refreshing. If the issue continues, contact support.';
  }

  if (/metadata uri exceeds/i.test(trimmed)) {
    return 'NFT metadata URL is too long to mint on Solana. Please refresh and try again.';
  }

  try {
    const parsed = JSON.parse(trimmed) as { statusCode?: number | string; message?: string };
    if (normalizedStatusCode(parsed.statusCode) === 409) {
      return 'A previous upload was interrupted. Please try minting again.';
    }
    if (typeof parsed.message === 'string' && parsed.message.length > 0) {
      return `NFT mint failed: ${parsed.message}`;
    }
  } catch {
    // not JSON — use trimmed text below
  }

  return trimmed;
}

async function finishUpload(path: string): Promise<
  { ok: true; path: string; url: string } | { ok: false; message: string }
> {
  const url = publicObjectUrl(path);
  if (!url) return { ok: false, message: 'Could not build public asset URL.' };
  return { ok: true, path, url };
}

export async function uploadPhotoMomentImage(params: {
  dataUrl: string;
  cluster: string;
  packId: string;
  walletAddress: string;
  sessionId: string;
  photoIndex: number;
  scoreReceiptTx?: string | null;
}): Promise<{ ok: true; path: string; url: string } | { ok: false; message: string }> {
  const config = requireSupabaseForNft();
  if (!config.ok) return { ok: false, message: config.message };

  const extension = imageExtensionFromDataUrl(params.dataUrl);
  if (!extension) {
    return { ok: false, message: 'Photo must be PNG or JPEG.' };
  }

  const blob = dataUrlToBlob(params.dataUrl);
  if (!blob) return { ok: false, message: 'Could not read photo data.' };

  const path = buildStorageObjectPath({
    cluster: params.cluster,
    packId: params.packId,
    walletAddress: params.walletAddress,
    sessionId: params.sessionId,
    photoIndex: params.photoIndex,
    extension,
    scoreReceiptTx: params.scoreReceiptTx,
  });

  const uploaded = await uploadObject(path, blob, blob.type, false);
  if (!uploaded.ok) return { ok: false, message: uploaded.message };

  return finishUpload(path);
}

export async function uploadPhotoMomentMetadata(params: {
  metadata: ReturnType<typeof buildPhotoMomentMetadata>;
  cluster: string;
  packId: string;
  walletAddress: string;
  sessionId: string;
  photoIndex: number;
  scoreReceiptTx?: string | null;
}): Promise<{ ok: true; path: string; url: string } | { ok: false; message: string }> {
  const config = requireSupabaseForNft();
  if (!config.ok) return { ok: false, message: config.message };

  const path = buildStorageObjectPath({
    cluster: params.cluster,
    packId: params.packId,
    walletAddress: params.walletAddress,
    sessionId: params.sessionId,
    photoIndex: params.photoIndex,
    extension: 'json',
    scoreReceiptTx: params.scoreReceiptTx,
  });

  const body = JSON.stringify(params.metadata, null, 2);
  const uploaded = await uploadObject(path, body, 'application/json', false);
  if (!uploaded.ok) return { ok: false, message: uploaded.message };

  return finishUpload(path);
}

export async function preparePhotoMomentNftAssets(
  input: PhotoMomentMetadataInput & { dataUrl: string },
): Promise<{ ok: true; assets: PreparedPhotoMomentAssets } | { ok: false; message: string }> {
  const imageUpload = await uploadPhotoMomentImage({
    dataUrl: input.dataUrl,
    cluster: input.cluster,
    packId: input.packId,
    walletAddress: input.walletAddress,
    sessionId: input.sessionId,
    photoIndex: input.photoIndex,
    scoreReceiptTx: input.scoreReceiptTx,
  });
  if (!imageUpload.ok) return { ok: false, message: imageUpload.message };

  const metadata = buildPhotoMomentMetadata({
    ...input,
    imageUrl: imageUpload.url,
  });

  const metadataUpload = await uploadPhotoMomentMetadata({
    metadata,
    cluster: input.cluster,
    packId: input.packId,
    walletAddress: input.walletAddress,
    sessionId: input.sessionId,
    photoIndex: input.photoIndex,
    scoreReceiptTx: input.scoreReceiptTx,
  });
  if (!metadataUpload.ok) return { ok: false, message: metadataUpload.message };

  try {
    assertMetadataUriWithinLimit(metadataUpload.url);
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : String(err),
    };
  }

  return {
    ok: true,
    assets: {
      imagePath: imageUpload.path,
      metadataPath: metadataUpload.path,
      imageUrl: imageUpload.url,
      metadataUrl: metadataUpload.url,
      metadata,
    },
  };
}
