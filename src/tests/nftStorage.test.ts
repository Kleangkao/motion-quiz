import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { buildStorageObjectPath } from '@/nft/nftMetadata';
import { uploadPhotoMomentImage } from '@/nft/nftStorage';

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
      expect.any(Object),
    );
  });
});
