import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { walletSupportsScoreRecording } from '@/solana/scoreReceiptSender';

describe('walletSupportsScoreRecording', () => {
  beforeEach(() => {
    vi.stubGlobal('window', {
      phantom: undefined,
      solana: undefined,
      solflare: undefined,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns false when no wallet is connected', () => {
    expect(walletSupportsScoreRecording({ browserWalletId: null, wallet: null })).toBe(false);
  });

  it('returns true for browser wallets with transaction methods', () => {
    const phantom = {
      isPhantom: true,
      connect: vi.fn(),
      disconnect: vi.fn(),
      signMessage: vi.fn(),
      signAndSendTransaction: vi.fn(),
    };
    vi.stubGlobal('window', { phantom: { solana: phantom } });
    expect(walletSupportsScoreRecording({ browserWalletId: 'phantom', wallet: null })).toBe(true);
  });
});
