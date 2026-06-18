import { describe, expect, it } from 'vitest';
import {
  buildPhotoMomentMetadata,
  buildStorageObjectPath,
  dataUrlToBlob,
  imageExtensionFromDataUrl,
} from '@/nft/nftMetadata';

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

  it('uses cluster-prefixed storage paths', () => {
    expect(
      buildStorageObjectPath({
        cluster: 'devnet',
        packId: 'pack-a',
        walletAddress: 'wallet-a',
        sessionId: 'session-a',
        photoIndex: 0,
        extension: 'png',
      }),
    ).toBe('devnet/pack-a/wallet-a/session-a/photo-1.png');
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
