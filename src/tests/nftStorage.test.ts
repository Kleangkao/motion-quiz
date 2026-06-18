import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { buildStorageObjectPath } from '@/nft/nftMetadata';
import {
  formatPhotoMomentMintError,
  preparePhotoMomentNftAssets,
  uploadPhotoMomentImage,
  uploadPhotoMomentMetadata,
} from '@/nft/nftStorage';
import { NFT_ASSETS_BUCKET } from '@/nft/types';

describe('nftStorage', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key');
    vi.stubEnv('VITE_SOLANA_CLUSTER', 'devnet');
    vi.stubEnv('VITE_SOLANA_RPC_URL', 'https://api.devnet.solana.com');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('returns configured-state error when Supabase env is missing', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');

    const result = await uploadPhotoMomentImage({
      dataUrl: 'data:image/png;base64,abc',
      cluster: 'devnet',
      packId: 'pack',
      walletAddress: 'wallet',
      sessionId: 'session',
      photoIndex: 0,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toMatch(/not configured/i);
  });

  it('upload path includes cluster pack wallet and session', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', fetchMock);

    const result = await uploadPhotoMomentImage({
      dataUrl: 'data:image/png;base64,YWJj',
      cluster: 'mainnet-beta',
      packId: 'islanddao-challenge',
      walletAddress: 'Wallet111111111111111111111111111111111111111',
      sessionId: 'session-abc',
      photoIndex: 1,
    });

    expect(result.ok).toBe(true);
    const expectedPath = buildStorageObjectPath({
      cluster: 'mainnet-beta',
      packId: 'islanddao-challenge',
      walletAddress: 'Wallet111111111111111111111111111111111111111',
      sessionId: 'session-abc',
      photoIndex: 1,
      extension: 'png',
    });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(expectedPath),
      expect.objectContaining({
        headers: expect.objectContaining({ 'x-upsert': 'false' }),
      }),
    );
  });

  it('reuses public image URL when upload returns 409 Duplicate', async () => {
    const duplicateBody =
      '{"statusCode":"409","error":"Duplicate","message":"The resource already exists"}';
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      text: async () => duplicateBody,
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await uploadPhotoMomentImage({
      dataUrl: 'data:image/png;base64,YWJj',
      cluster: 'mainnet-beta',
      packId: 'islanddao-challenge',
      walletAddress: 'Wallet111111111111111111111111111111111111111',
      sessionId: 'session-abc',
      photoIndex: 0,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.url).toBe(
      `https://example.supabase.co/storage/v1/object/public/${NFT_ASSETS_BUCKET}/` +
        buildStorageObjectPath({
          cluster: 'mainnet-beta',
          packId: 'islanddao-challenge',
          walletAddress: 'Wallet111111111111111111111111111111111111111',
          sessionId: 'session-abc',
          photoIndex: 0,
          extension: 'png',
        }),
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('reuses public metadata URL when upload returns 409 Duplicate', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      text: async () =>
        '{"statusCode":"409","error":"Duplicate","message":"The resource already exists"}',
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await uploadPhotoMomentMetadata({
      metadata: {
        name: 'Photo Moment',
        symbol: 'MOTION',
        description: 'Test',
        image: 'https://example.com/image.png',
        attributes: [],
      },
      cluster: 'mainnet-beta',
      packId: 'islanddao-challenge',
      walletAddress: 'Wallet111111111111111111111111111111111111111',
      sessionId: 'session-abc',
      photoIndex: 1,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.url).toContain('photo-2.json');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('preparePhotoMomentNftAssets continues when image and metadata uploads return 409', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      text: async () =>
        '{"statusCode":"409","error":"Duplicate","message":"The resource already exists"}',
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await preparePhotoMomentNftAssets({
      dataUrl: 'data:image/png;base64,YWJj',
      cluster: 'mainnet-beta',
      packId: 'islanddao-challenge',
      packTitle: 'IslandDAO Challenge',
      sessionId: 'session-abc',
      walletAddress: 'Wallet111111111111111111111111111111111111111',
      score: 80,
      total: 10,
      accuracy: 80,
      durationMs: 300000,
      scoreReceiptTx: 'tx-score',
      capturedAt: '2026-01-01T00:00:00.000Z',
      photoIndex: 0,
      imageUrl: '',
      externalUrl: 'https://motion-quiz.vercel.app',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.assets.imageUrl).toContain('photo-1.png');
    expect(result.assets.metadataUrl).toContain('photo-1.json');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not upsert when retrying after interrupted upload', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      text: async () => '{"statusCode":"409","error":"Duplicate"}',
    });
    vi.stubGlobal('fetch', fetchMock);

    await uploadPhotoMomentImage({
      dataUrl: 'data:image/png;base64,YWJj',
      cluster: 'devnet',
      packId: 'pack',
      walletAddress: 'wallet',
      sessionId: 'session',
      photoIndex: 0,
    });

    expect(fetchMock.mock.calls[0]?.[1]?.headers?.['x-upsert']).toBe('false');
  });
});

describe('formatPhotoMomentMintError', () => {
  it('maps raw 409 JSON to friendly copy', () => {
    expect(
      formatPhotoMomentMintError(
        '{"statusCode":"409","error":"Duplicate","message":"The resource already exists"}',
      ),
    ).toBe('A previous upload was interrupted. Please try minting again.');
  });

  it('maps network errors to friendly copy', () => {
    expect(formatPhotoMomentMintError('Failed to fetch')).toMatch(/network error/i);
  });
});
