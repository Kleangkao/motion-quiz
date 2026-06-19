import { describe, expect, it } from 'vitest';
import {
  METADATA_URI_MAX_LENGTH,
  assertMetadataUriWithinLimit,
  buildNftPublicObjectUrl,
  buildPhotoMomentAssetKey,
  buildPhotoMomentMetadata,
  buildStorageObjectPath,
  dataUrlToBlob,
  imageExtensionFromDataUrl,
} from '@/nft/nftMetadata';
import { NFT_ASSETS_BUCKET } from '@/nft/types';

const PRODUCTION_SUPABASE = 'https://qpynjdcgpqeknjlmlmju.supabase.co';
const WORST_CASE_WALLET = 'JCVsKd8vQn2mP4rT6wX9yZ1aB3cD5eF7gH9jK1mN3pR5tV7xY9zA1bC3dE5fG7';
const WORST_CASE_SESSION = '550e8400-e29b-41d4-a716-446655440000';
const WORST_CASE_PACK = 'islanddao-challenge';
const WORST_CASE_RECEIPT =
  '5xKp9mN2vR8tY4wZ6aB1cD3eF5gH7jK9mN1pQ3rT5vX7yZ9aC1dE3fG5hJ7kM9nP1qS3uW5yA7b';

function legacyStorageObjectPath(params: {
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

function metadataPublicUrl(cluster: string): string {
  const path = buildStorageObjectPath({
    cluster,
    packId: WORST_CASE_PACK,
    walletAddress: WORST_CASE_WALLET,
    sessionId: WORST_CASE_SESSION,
    photoIndex: 0,
    extension: 'json',
    scoreReceiptTx: WORST_CASE_RECEIPT,
  });
  return buildNftPublicObjectUrl(PRODUCTION_SUPABASE, path);
}

describe('nftMetadata', () => {
  it('builds metadata with cluster and score receipt', () => {
    const metadata = buildPhotoMomentMetadata({
      cluster: 'devnet',
      packId: 'islanddao-challenge',
      packTitle: 'IslandDAO Challenge',
      sessionId: 'session-1',
      walletAddress: 'Wallet111111111111111111111111111111111111111',
      score: 80,
      total: 10,
      accuracy: 80,
      durationMs: 120000,
      scoreReceiptTx: 'tx-signature-abc',
      capturedAt: '2026-01-01T00:00:00.000Z',
      photoIndex: 0,
      imageUrl: 'https://example.com/image.png',
      externalUrl: 'https://motion-quiz.vercel.app',
    });

    expect(metadata.name).toContain('devnet');
    expect(metadata.symbol).toBe('MQPM');
    expect(metadata.image).toBe('https://example.com/image.png');
    expect(metadata.external_url).toBe('https://motion-quiz.vercel.app');
    expect(metadata.attributes).toEqual(
      expect.arrayContaining([
        { trait_type: 'cluster', value: 'devnet' },
        { trait_type: 'score_receipt_tx', value: 'tx-signature-abc' },
      ]),
    );
  });

  it('builds mainnet-beta metadata without devnet in the name label', () => {
    const metadata = buildPhotoMomentMetadata({
      cluster: 'mainnet-beta',
      packId: 'solana-basics',
      packTitle: 'Solana Basics',
      sessionId: 'session-2',
      walletAddress: 'Wallet111111111111111111111111111111111111111',
      score: 50,
      total: 5,
      accuracy: 50,
      durationMs: null,
      scoreReceiptTx: null,
      capturedAt: '2026-01-01T00:00:00.000Z',
      photoIndex: 1,
      imageUrl: 'https://example.com/image.jpg',
      externalUrl: null,
    });

    expect(metadata.name).toContain('mainnet');
    expect(metadata.attributes).toEqual(
      expect.arrayContaining([{ trait_type: 'cluster', value: 'mainnet-beta' }]),
    );
  });

  it('uses short cluster-prefixed storage paths without full wallet or session id', () => {
    const path = buildStorageObjectPath({
      cluster: 'devnet',
      packId: 'pack-a',
      walletAddress: 'wallet-a-long-address-should-not-appear',
      sessionId: 'session-a-long-id-should-not-appear',
      photoIndex: 0,
      extension: 'png',
      scoreReceiptTx: 'tx-receipt',
    });

    expect(path).toMatch(/^devnet\/n\/[0-9a-f]{32}\/p1\.png$/);
    expect(path).not.toContain('wallet-a-long-address-should-not-appear');
    expect(path).not.toContain('session-a-long-id-should-not-appear');
    expect(path).not.toContain('pack-a');
  });

  it('keeps asset paths deterministic for the same session and photo', () => {
    const params = {
      cluster: 'mainnet-beta',
      packId: WORST_CASE_PACK,
      walletAddress: WORST_CASE_WALLET,
      sessionId: WORST_CASE_SESSION,
      photoIndex: 0,
      scoreReceiptTx: WORST_CASE_RECEIPT,
    };

    expect(buildPhotoMomentAssetKey(params)).toBe(buildPhotoMomentAssetKey(params));
    expect(
      buildStorageObjectPath({ ...params, extension: 'json' }),
    ).toBe(
      buildStorageObjectPath({ ...params, extension: 'json' }),
    );
  });

  it('uses different asset paths for different photo indexes', () => {
    const base = {
      cluster: 'mainnet-beta' as const,
      packId: WORST_CASE_PACK,
      walletAddress: WORST_CASE_WALLET,
      sessionId: WORST_CASE_SESSION,
      scoreReceiptTx: WORST_CASE_RECEIPT,
    };

    const photo0 = buildStorageObjectPath({ ...base, photoIndex: 0, extension: 'png' });
    const photo1 = buildStorageObjectPath({ ...base, photoIndex: 1, extension: 'png' });
    expect(photo0).not.toBe(photo1);
    expect(photo0).toContain('/p1.png');
    expect(photo1).toContain('/p2.png');
  });

  it('confirms legacy mainnet metadata URL exceeded the Metaplex limit', () => {
    const legacyUrl = buildNftPublicObjectUrl(
      PRODUCTION_SUPABASE,
      legacyStorageObjectPath({
        cluster: 'mainnet-beta',
        packId: WORST_CASE_PACK,
        walletAddress: WORST_CASE_WALLET,
        sessionId: WORST_CASE_SESSION,
        photoIndex: 0,
        extension: 'json',
      }),
    );

    expect(legacyUrl.length).toBeGreaterThan(METADATA_URI_MAX_LENGTH);
  });

  it('keeps mainnet metadata public URL within the Metaplex limit', () => {
    const url = metadataPublicUrl('mainnet-beta');
    expect(url.length).toBeLessThanOrEqual(METADATA_URI_MAX_LENGTH);
    expect(url).toContain(`${NFT_ASSETS_BUCKET}/mainnet-beta/n/`);
  });

  it('keeps devnet metadata public URL within the Metaplex limit', () => {
    const url = metadataPublicUrl('devnet');
    expect(url.length).toBeLessThanOrEqual(METADATA_URI_MAX_LENGTH);
  });

  it('rejects metadata URIs over the Metaplex limit', () => {
    expect(() => assertMetadataUriWithinLimit('https://example.com/' + 'a'.repeat(200))).toThrow(
      /exceeds 200/i,
    );
  });

  it('converts jpeg data URLs to blobs', () => {
    const tiny =
      'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAkGBxAQEhUQEhIVFhUVFRUVFRUVFRUVFRUWFxUVFRUYHSggGBolGxUVITEhJSkrLi4uFx8zODMtNygtLisBCgoKDg0OGxAQGy0lHyUtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLf/AABEIAAEAAQMBIgACEQEDEQH/xAAXAAEBAQEAAAAAAAAAAAAAAAAAAQID/8QAFhEBAQEAAAAAAAAAAAAAAAAAAAER/9oADAMBAAIQAxAAAAGqP//EABQQAQAAAAAAAAAAAAAAAAAAABD/2gAIAQEAAQUCf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQMBAT8Bf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQIBAT8Bf//EABQQAQAAAAAAAAAAAAAAAAAAABD/2gAIAQEABj8Cf//EABQQAQAAAAAAAAAAAAAAAAAAABD/2gAIAQEAAT8hf//Z';
    expect(imageExtensionFromDataUrl(tiny)).toBe('jpg');
    const blob = dataUrlToBlob(tiny);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob?.type).toBe('image/jpeg');
  });
});
