import { describe, expect, it } from 'vitest';
import { buildVerifyScoreRequest } from '@/solana/scoreReceiptVerifier';
import { solanaExplorerTxUrl } from '@/solana/explorer';

describe('scoreReceiptVerifier', () => {
  it('builds verify-score request shape', () => {
    const request = buildVerifyScoreRequest({
      txSignature: 'sig-123',
      expected: {
        cluster: 'devnet',
        walletAddress: 'Wallet1111111111111111111111111111111111',
        packId: 'islanddao-challenge',
        packTitle: 'IslandDAO Challenge',
        packContentHash: 'abc',
        sessionId: 'sess-1',
        score: 4,
        total: 5,
        accuracy: 80,
        durationMs: 42000,
        resultHash: 'def',
      },
    });

    expect(request.txSignature).toBe('sig-123');
    expect(request.expected.packId).toBe('islanddao-challenge');
    expect(request.expected.cluster).toBe('devnet');
  });
});

describe('explorer urls', () => {
  it('uses devnet cluster query param', () => {
    expect(solanaExplorerTxUrl('abc123', 'devnet')).toBe(
      'https://explorer.solana.com/tx/abc123?cluster=devnet',
    );
  });

  it('uses mainnet explorer url without cluster param', () => {
    expect(solanaExplorerTxUrl('abc123', 'mainnet-beta')).toBe(
      'https://explorer.solana.com/tx/abc123',
    );
  });
});
