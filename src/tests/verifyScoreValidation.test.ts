import { describe, expect, it } from 'vitest';
import {
  extractMemoFromTransaction,
  validateVerifyScoreRequest,
  verifyMemoAgainstExpected,
} from '../../supabase/functions/verify-score/validation';
import { serializeScoreReceiptPayload } from '@shared/scoreReceipt';

const WALLET = 'Wallet1111111111111111111111111111111111';
const MEMO_PROGRAM_ID = 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr';

const expected = {
  cluster: 'devnet' as const,
  walletAddress: WALLET,
  packId: 'islanddao-challenge',
  packTitle: 'IslandDAO Challenge',
  packContentHash: 'deadbeef',
  sessionId: 'sess-1',
  score: 4,
  total: 5,
  accuracy: 80,
  durationMs: 42000,
  resultHash: 'cafebabe',
};

const memoPayload = {
  app: 'motion-quiz' as const,
  type: 'score_receipt' as const,
  version: 1 as const,
  ...expected,
};

function mockTransaction(memoText: string, signers: string[] = [WALLET]) {
  const accountKeys = [...signers, MEMO_PROGRAM_ID].map((address) => ({
    toBase58: () => address,
  }));

  return {
    meta: { err: null },
    slot: 12345,
    blockTime: 1_700_000_000,
    transaction: {
      signatures: ['sig-abc'],
      message: {
        header: { numRequiredSignatures: signers.length },
        staticAccountKeys: accountKeys,
        compiledInstructions: [
          {
            programIdIndex: signers.length,
            data: memoText,
          },
        ],
      },
    },
  };
}

describe('verify-score validation helpers', () => {
  it('validates request body shape', () => {
    const valid = validateVerifyScoreRequest({ txSignature: 'sig-abc', expected });
    expect('error' in valid).toBe(false);
    if (!('error' in valid)) {
      expect(valid.txSignature).toBe('sig-abc');
    }

    const missing = validateVerifyScoreRequest({ txSignature: 'sig-abc' });
    expect(missing).toEqual({ error: 'expected payload is required' });
  });

  it('extracts memo and signers from mock transaction', () => {
    const memo = serializeScoreReceiptPayload(memoPayload);
    const result = extractMemoFromTransaction(mockTransaction(memo), 'sig-abc');
    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      expect(result.memo).toBe(memo);
      expect(result.signers).toContain(WALLET);
      expect(result.slot).toBe(12345);
    }
  });

  it('rejects when wallet is not a signer', () => {
    const memo = serializeScoreReceiptPayload(memoPayload);
    const extracted = extractMemoFromTransaction(mockTransaction(memo, ['OtherWallet111111111111111111111111111']), 'sig-abc');
    expect('error' in extracted).toBe(false);
    if (!('error' in extracted)) {
      const verified = verifyMemoAgainstExpected(extracted.memo, expected, extracted.signers);
      expect(verified).toEqual({ error: 'walletAddress is not a transaction signer' });
    }
  });

  it('accepts memo matching expected payload', () => {
    const memo = serializeScoreReceiptPayload(memoPayload);
    const extracted = extractMemoFromTransaction(mockTransaction(memo), 'sig-abc');
    expect('error' in extracted).toBe(false);
    if (!('error' in extracted)) {
      const verified = verifyMemoAgainstExpected(extracted.memo, expected, extracted.signers);
      expect('payload' in verified).toBe(true);
    }
  });
});
