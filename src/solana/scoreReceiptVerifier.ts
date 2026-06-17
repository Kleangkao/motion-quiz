import type { ScoreReceiptExpected } from '@shared/scoreReceipt';
import { getSupabaseAnonKey, getSupabaseUrl } from '@/solana/env';

export interface VerifyScoreRequestBody {
  txSignature: string;
  expected: ScoreReceiptExpected;
}

export interface VerifiedScoreRow {
  id: string;
  wallet_address: string;
  wallet_short: string;
  cluster: string;
  pack_id: string;
  pack_title: string;
  pack_content_hash: string;
  score: number;
  total: number;
  accuracy: number;
  duration_ms: number | null;
  session_id: string;
  result_hash: string;
  tx_signature: string;
  slot: number | null;
  block_time: string | null;
  created_at: string;
}

export interface VerifyScoreSuccess {
  ok: true;
  score: VerifiedScoreRow;
  txSignature: string;
  slot: number | null;
  blockTime: string | null;
  duplicate?: boolean;
}

export interface VerifyScoreFailure {
  ok: false;
  error: string;
}

export type VerifyScoreResponse = VerifyScoreSuccess | VerifyScoreFailure;

export function buildVerifyScoreRequest(body: VerifyScoreRequestBody): VerifyScoreRequestBody {
  return {
    txSignature: body.txSignature.trim(),
    expected: { ...body.expected },
  };
}

export async function verifyScoreReceipt(body: VerifyScoreRequestBody): Promise<VerifyScoreResponse> {
  const supabaseUrl = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();
  if (!supabaseUrl || !anonKey) {
    return { ok: false, error: 'Supabase is not configured for score verification.' };
  }

  const request = buildVerifyScoreRequest(body);

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/verify-score`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
      body: JSON.stringify(request),
    });

    const data = (await response.json()) as VerifyScoreResponse;
    if (!response.ok) {
      return data.ok === false
        ? data
        : { ok: false, error: 'Could not verify score yet.' };
    }
    return data;
  } catch {
    return { ok: false, error: 'Could not verify score yet.' };
  }
}
