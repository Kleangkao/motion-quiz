import { describe, expect, it } from 'vitest';
import { PublicKey } from '@solana/web3.js';
import { createMemoInstruction, buildScoreReceiptTransaction } from '@/solana/scoreReceiptTransaction';
import { MEMO_PROGRAM_ID, serializeScoreReceiptPayload } from '@/solana/scoreReceipt';

describe('scoreReceiptTransaction', () => {
  it('creates a memo instruction for the signer', () => {
    const signer = new PublicKey('11111111111111111111111111111111');
    const instruction = createMemoInstruction('{"app":"motion-quiz"}', signer);

    expect(instruction.programId.toBase58()).toBe(MEMO_PROGRAM_ID);
    expect(instruction.keys).toHaveLength(1);
    expect(instruction.keys[0]?.pubkey.equals(signer)).toBe(true);
    expect(new TextDecoder().decode(instruction.data)).toBe('{"app":"motion-quiz"}');
  });

  it('rejects oversized memo payloads before RPC lookup', async () => {
    const wallet = '11111111111111111111111111111111';
    const payload = {
      app: 'motion-quiz' as const,
      type: 'score_receipt' as const,
      version: 1 as const,
      cluster: 'devnet' as const,
      packId: 'islanddao-challenge',
      packTitle: 'x'.repeat(900),
      packContentHash: 'x'.repeat(64),
      sessionId: 'session',
      walletAddress: wallet,
      score: 1,
      total: 1,
      accuracy: 100,
      durationMs: 1,
      resultHash: 'y'.repeat(64),
    };

    expect(serializeScoreReceiptPayload(payload).length).toBeGreaterThanOrEqual(900);
    await expect(buildScoreReceiptTransaction(wallet, payload)).rejects.toThrow(/too large/i);
  });
});
