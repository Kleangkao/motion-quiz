/**
 * Shared score receipt types and pure helpers.
 * Used by the verify-score Edge Function and frontend (via @shared alias).
 *
 * Hackathon-demo verification: memo + on-chain tx checks only.
 * A malicious client can still craft bogus scores until server-issued
 * nonce/session validation is added in a later phase.
 */

export const SCORE_RECEIPT_APP = 'motion-quiz' as const;
export const SCORE_RECEIPT_TYPE = 'score_receipt' as const;
export const SCORE_RECEIPT_VERSION = 1 as const;

export const MEMO_PROGRAM_ID = 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr';

export type SolanaCluster = 'devnet' | 'mainnet-beta';

export interface ScoreReceiptPayload {
  app: typeof SCORE_RECEIPT_APP;
  type: typeof SCORE_RECEIPT_TYPE;
  version: typeof SCORE_RECEIPT_VERSION;
  cluster: SolanaCluster;
  packId: string;
  packTitle: string;
  packContentHash: string;
  sessionId: string;
  walletAddress: string;
  score: number;
  total: number;
  accuracy: number;
  durationMs: number;
  resultHash: string;
}

export interface ScoreReceiptExpected {
  cluster: SolanaCluster;
  walletAddress: string;
  packId: string;
  packTitle: string;
  packContentHash: string;
  sessionId: string;
  score: number;
  total: number;
  accuracy: number;
  durationMs: number;
  resultHash: string;
}

/** Quiz content fields used for canonical pack hashing (excludes timestamps). */
export interface PackContentForHash {
  id: string;
  title: string;
  schemaVersion: number;
  questions: Array<{
    id: string;
    prompt: string;
    correctSide: 'left' | 'right';
    left: { id: string; label?: string; imageValue?: string };
    right: { id: string; label?: string; imageValue?: string };
  }>;
}

export interface ResultHashInput {
  sessionId: string;
  packId: string;
  packContentHash: string;
  walletAddress: string;
  score: number;
  total: number;
  accuracy: number;
  durationMs: number;
}

export function normalizeAccuracyPercent(correct: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((correct / total) * 100);
}

export function resultTotalFromSession(totalAnswered: number, skippedCount: number): number {
  return totalAnswered + skippedCount;
}

export function shortenWalletAddress(address: string): string {
  if (address.length <= 8) return address;
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(',')}}`;
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export function canonicalizePackContent(pack: PackContentForHash): PackContentForHash {
  const questions = [...pack.questions]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((question) => ({
      id: question.id,
      prompt: question.prompt,
      correctSide: question.correctSide,
      left: {
        id: question.left.id,
        ...(question.left.label !== undefined ? { label: question.left.label } : {}),
        ...(question.left.imageValue !== undefined ? { imageValue: question.left.imageValue } : {}),
      },
      right: {
        id: question.right.id,
        ...(question.right.label !== undefined ? { label: question.right.label } : {}),
        ...(question.right.imageValue !== undefined ? { imageValue: question.right.imageValue } : {}),
      },
    }));

  return {
    id: pack.id,
    title: pack.title,
    schemaVersion: pack.schemaVersion,
    questions,
  };
}

export async function computePackContentHash(pack: PackContentForHash): Promise<string> {
  const canonical = canonicalizePackContent(pack);
  return sha256Hex(stableStringify(canonical));
}

export async function computeResultHash(input: ResultHashInput): Promise<string> {
  const body = {
    sessionId: input.sessionId,
    packId: input.packId,
    packContentHash: input.packContentHash,
    walletAddress: input.walletAddress,
    score: input.score,
    total: input.total,
    accuracy: input.accuracy,
    durationMs: input.durationMs,
  };
  return sha256Hex(stableStringify(body));
}

export function serializeScoreReceiptPayload(payload: ScoreReceiptPayload): string {
  return JSON.stringify(payload);
}

export function parseScoreReceiptMemo(memoText: string): ScoreReceiptPayload | null {
  try {
    const parsed = JSON.parse(memoText) as Partial<ScoreReceiptPayload>;
    if (parsed.app !== SCORE_RECEIPT_APP) return null;
    if (parsed.type !== SCORE_RECEIPT_TYPE) return null;
    if (parsed.version !== SCORE_RECEIPT_VERSION) return null;
    if (typeof parsed.cluster !== 'string') return null;
    if (typeof parsed.packId !== 'string') return null;
    if (typeof parsed.packTitle !== 'string') return null;
    if (typeof parsed.packContentHash !== 'string') return null;
    if (typeof parsed.sessionId !== 'string') return null;
    if (typeof parsed.walletAddress !== 'string') return null;
    if (typeof parsed.score !== 'number') return null;
    if (typeof parsed.total !== 'number') return null;
    if (typeof parsed.accuracy !== 'number') return null;
    if (typeof parsed.durationMs !== 'number') return null;
    if (typeof parsed.resultHash !== 'string') return null;
    return parsed as ScoreReceiptPayload;
  } catch {
    return null;
  }
}

export function scoreReceiptMatchesExpected(
  memo: ScoreReceiptPayload,
  expected: ScoreReceiptExpected,
): boolean {
  return (
    memo.cluster === expected.cluster &&
    memo.walletAddress === expected.walletAddress &&
    memo.packId === expected.packId &&
    memo.packTitle === expected.packTitle &&
    memo.packContentHash === expected.packContentHash &&
    memo.sessionId === expected.sessionId &&
    memo.score === expected.score &&
    memo.total === expected.total &&
    memo.accuracy === expected.accuracy &&
    memo.durationMs === expected.durationMs &&
    memo.resultHash === expected.resultHash
  );
}

export function validateScoreReceiptFields(payload: ScoreReceiptPayload): string | null {
  if (payload.score < 0) return 'score must be >= 0';
  if (payload.total <= 0) return 'total must be > 0';
  if (payload.score > payload.total) return 'score must be <= total';
  if (payload.accuracy < 0 || payload.accuracy > 100) return 'accuracy must be between 0 and 100';
  if (payload.cluster !== 'devnet' && payload.cluster !== 'mainnet-beta') {
    return 'cluster must be devnet or mainnet-beta';
  }
  if (payload.durationMs < 0) return 'durationMs must be >= 0';
  return null;
}

export function validateExpectedInput(expected: ScoreReceiptExpected): string | null {
  if (!expected.walletAddress?.trim()) return 'walletAddress is required';
  if (!expected.packId?.trim()) return 'packId is required';
  if (!expected.packTitle?.trim()) return 'packTitle is required';
  if (!expected.packContentHash?.trim()) return 'packContentHash is required';
  if (!expected.sessionId?.trim()) return 'sessionId is required';
  if (!expected.resultHash?.trim()) return 'resultHash is required';
  if (expected.cluster !== 'devnet' && expected.cluster !== 'mainnet-beta') {
    return 'cluster must be devnet or mainnet-beta';
  }
  const asPayload: ScoreReceiptPayload = {
    app: SCORE_RECEIPT_APP,
    type: SCORE_RECEIPT_TYPE,
    version: SCORE_RECEIPT_VERSION,
    ...expected,
  };
  return validateScoreReceiptFields(asPayload);
}
