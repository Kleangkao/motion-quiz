import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  clusterLabel,
  clusterShortLabel,
  getSolanaAppConfig,
  isNftMintingEnabledFlag,
} from '@/solana/solanaConfig';
import { solanaExplorerAddressUrl, solanaExplorerTxUrl } from '@/solana/explorer';
import { validateMintPrerequisites } from '@/nft/photoMomentNftClient';

describe('solanaConfig', () => {
  const originalEnv = { ...import.meta.env };

  beforeEach(() => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key');
    vi.stubEnv('VITE_SOLANA_CLUSTER', 'devnet');
    vi.stubEnv('VITE_SOLANA_RPC_URL', 'https://api.devnet.solana.com');
    vi.stubEnv('VITE_NFT_MINTING_ENABLED', 'true');
  });

  afterEach(() => {
    Object.assign(import.meta.env, originalEnv);
    vi.unstubAllEnvs();
  });

  it('returns devnet config and labels', () => {
    const result = getSolanaAppConfig();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.config.cluster).toBe('devnet');
    expect(clusterLabel('devnet')).toBe('Solana devnet');
    expect(clusterShortLabel('devnet')).toBe('devnet');
    expect(result.config.nftMintingEnabled).toBe(true);
  });

  it('rejects unsupported cluster values', () => {
    vi.stubEnv('VITE_SOLANA_CLUSTER', 'testnet');
    const result = getSolanaAppConfig();
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe('cluster_unsupported');
  });

  it('builds cluster-aware explorer URLs', () => {
    expect(solanaExplorerTxUrl('sig123', 'devnet')).toContain('cluster=devnet');
    expect(solanaExplorerAddressUrl('addr123', 'mainnet-beta')).not.toContain('cluster=devnet');
  });
});

describe('validateMintPrerequisites', () => {
  it('requires recorded score and matching cluster', () => {
    const missing = validateMintPrerequisites({
      walletAddress: 'wallet-a',
      photoDataUrl: 'data:image/jpeg;base64,abc',
      recordedScore: null,
      sessionId: 's1',
      cluster: 'devnet',
    });
    expect(missing.ok).toBe(false);

    const mismatch = validateMintPrerequisites({
      walletAddress: 'wallet-a',
      photoDataUrl: 'data:image/jpeg;base64,abc',
      recordedScore: {
        sessionId: 's1',
        txSignature: 'tx',
        verified: true,
        cluster: 'mainnet-beta',
        packId: 'pack',
        packContentHash: 'hash',
        recordedAt: '2026-01-01T00:00:00.000Z',
      },
      sessionId: 's1',
      cluster: 'devnet',
    });
    expect(mismatch.ok).toBe(false);
  });
});

describe('isNftMintingEnabledFlag', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('can be disabled via env', () => {
    vi.stubEnv('VITE_NFT_MINTING_ENABLED', 'false');
    expect(isNftMintingEnabledFlag()).toBe(false);
  });
});
