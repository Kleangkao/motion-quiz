import { getSupabaseAnonKey, getSupabaseUrl } from '@/solana/env';
import {
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

async function uploadObject(
  objectPath: string,
  body: Blob | string,
  contentType: string,
  upsert: boolean,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const base = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();
  if (!base || !anonKey) {
    return { ok: false, message: 'NFT storage is not configured.' };
  }

  const url = `${base.replace(/\/$/, '')}/storage/v1/object/${NFT_ASSETS_BUCKET}/${objectPath}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      'Content-Type': contentType,
      'x-upsert': upsert ? 'true' : 'false',
    },
    body,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    if (response.status === 404) {
      return { ok: false, message: 'NFT storage bucket is missing. Apply the Supabase migration.' };
    }
    if (response.status === 401 || response.status === 403) {
      return { ok: false, message: 'NFT storage upload is not permitted. Check bucket policies.' };
    }
    return { ok: false, message: text || 'Failed to upload NFT asset.' };
  }

  return { ok: true };
}

export async function uploadPhotoMomentImage(params: {
  dataUrl: string;
  cluster: string;
  packId: string;
  walletAddress: string;
  sessionId: string;
  photoIndex: number;
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
  });

  const uploaded = await uploadObject(path, blob, blob.type, false);
  if (!uploaded.ok) return { ok: false, message: uploaded.message };

  const url = publicObjectUrl(path);
  if (!url) return { ok: false, message: 'Could not build public image URL.' };
  return { ok: true, path, url };
}

export async function uploadPhotoMomentMetadata(params: {
  metadata: ReturnType<typeof buildPhotoMomentMetadata>;
  cluster: string;
  packId: string;
  walletAddress: string;
  sessionId: string;
  photoIndex: number;
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
  });

  const body = JSON.stringify(params.metadata, null, 2);
  const uploaded = await uploadObject(path, body, 'application/json', false);
  if (!uploaded.ok) return { ok: false, message: uploaded.message };

  const url = publicObjectUrl(path);
  if (!url) return { ok: false, message: 'Could not build public metadata URL.' };
  return { ok: true, path, url };
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
  });
  if (!metadataUpload.ok) return { ok: false, message: metadataUpload.message };

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
