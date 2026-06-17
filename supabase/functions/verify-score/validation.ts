import {
  MEMO_PROGRAM_ID,
  parseScoreReceiptMemo,
  scoreReceiptMatchesExpected,
  validateExpectedInput,
  type ScoreReceiptExpected,
  type ScoreReceiptPayload,
} from '../_shared/scoreReceipt.ts';

export interface VerifyScoreRequest {
  txSignature: string;
  expected: ScoreReceiptExpected;
}

export function validateVerifyScoreRequest(body: unknown): VerifyScoreRequest | { error: string } {
  if (!body || typeof body !== 'object') {
    return { error: 'Request body must be a JSON object' };
  }

  const record = body as Record<string, unknown>;
  const txSignature = record.txSignature;
  const expected = record.expected;

  if (typeof txSignature !== 'string' || !txSignature.trim()) {
    return { error: 'txSignature is required' };
  }

  if (!expected || typeof expected !== 'object') {
    return { error: 'expected payload is required' };
  }

  const expectedError = validateExpectedInput(expected as ScoreReceiptExpected);
  if (expectedError) {
    return { error: expectedError };
  }

  return {
    txSignature: txSignature.trim(),
    expected: expected as ScoreReceiptExpected,
  };
}

export function decodeMemoInstructionData(data: Uint8Array | string): string {
  if (typeof data === 'string') {
    return data;
  }
  return new TextDecoder().decode(data);
}

export function extractMemoFromTransaction(
  transaction: {
    meta: { err: unknown } | null;
    slot: number;
    blockTime: number | null;
    transaction: {
      message: {
        header?: { numRequiredSignatures: number };
        staticAccountKeys?: Array<{ toBase58(): string }>;
        accountKeys?: Array<{ toBase58(): string }>;
        compiledInstructions?: Array<{
          programIdIndex: number;
          data: Uint8Array | string;
        }>;
        instructions?: Array<{
          programIdIndex: number;
          data: Uint8Array | string;
        }>;
      };
      signatures: string[];
    };
  },
  txSignature: string,
): { memo: string; slot: number; blockTime: number | null; signers: string[] } | { error: string } {
  if (!transaction.meta || transaction.meta.err !== null) {
    return { error: 'Transaction failed or metadata missing' };
  }

  const message = transaction.transaction.message;
  const accountKeys = (message.staticAccountKeys ?? message.accountKeys ?? []).map((key) =>
    key.toBase58(),
  );

  if (accountKeys.length === 0) {
    return { error: 'Transaction account keys missing' };
  }

  const numSigners = message.header?.numRequiredSignatures ?? 1;
  const signers = accountKeys.slice(0, numSigners);

  const instructions = message.compiledInstructions ?? message.instructions ?? [];
  let memo: string | null = null;
  for (const instruction of instructions) {
    const programId = accountKeys[instruction.programIdIndex];
    if (programId !== MEMO_PROGRAM_ID) continue;
    memo = decodeMemoInstructionData(instruction.data);
    break;
  }

  if (!memo) {
    return { error: 'Memo Program instruction not found' };
  }

  if (!transaction.transaction.signatures.includes(txSignature)) {
    return { error: 'Transaction signature mismatch' };
  }

  return {
    memo,
    slot: transaction.slot,
    blockTime: transaction.blockTime,
    signers,
  };
}

export function verifyMemoAgainstExpected(
  memoText: string,
  expected: ScoreReceiptExpected,
  signers: string[],
): { payload: ScoreReceiptPayload } | { error: string } {
  const payload = parseScoreReceiptMemo(memoText);
  if (!payload) {
    return { error: 'Invalid score receipt memo JSON' };
  }

  if (!signers.includes(expected.walletAddress)) {
    return { error: 'walletAddress is not a transaction signer' };
  }

  if (payload.walletAddress !== expected.walletAddress) {
    return { error: 'Memo walletAddress does not match expected' };
  }

  if (!scoreReceiptMatchesExpected(payload, expected)) {
    return { error: 'Memo payload does not match expected score receipt' };
  }

  return { payload };
}
