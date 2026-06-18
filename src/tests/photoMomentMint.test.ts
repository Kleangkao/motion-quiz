// @vitest-environment node
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { Connection, PublicKey } from '@solana/web3.js';
import { buildPhotoMomentMintTransaction } from '@/nft/photoMomentMint';

vi.mock('@/solana/solanaConfig', () => ({
  getSolanaAppConfig: () => ({
    ok: true,
    config: {
      cluster: 'devnet',
      rpcUrl: 'https://api.devnet.solana.com',
      clusterLabel: 'Solana devnet',
      isProductionCluster: false,
      scoreRecordingEnabled: true,
      nftMintingEnabled: true,
      supabaseConfigured: true,
      appUrl: null,
    },
  }),
}));

describe('photoMomentMint', () => {
  beforeEach(() => {
    vi.spyOn(Connection.prototype, 'getLatestBlockhash').mockResolvedValue({
      blockhash: 'blockhash',
      lastValidBlockHeight: 123,
    });
    vi.spyOn(Connection.prototype, 'getMinimumBalanceForRentExemption').mockResolvedValue(1461600);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('builds a mint transaction plan for devnet', async () => {
    const wallet = PublicKey.default.toBase58();
    const plan = await buildPhotoMomentMintTransaction({
      walletAddress: wallet,
      metadataUri: 'https://example.com/meta.json',
      cluster: 'devnet',
      rpcUrl: 'https://api.devnet.solana.com',
    });

    expect(plan.transaction.instructions.length).toBeGreaterThanOrEqual(4);
    expect(plan.mintAddress).toMatch(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/);
    expect(plan.cluster).toBe('devnet');
  });

  it('requires metadata URI', async () => {
    await expect(
      buildPhotoMomentMintTransaction({
        walletAddress: PublicKey.default.toBase58(),
        metadataUri: '   ',
      }),
    ).rejects.toThrow(/Metadata URI/);
  });
});
