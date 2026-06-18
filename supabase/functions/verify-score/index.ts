import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { Connection } from 'https://esm.sh/@solana/web3.js@1.98.4';
import bs58 from 'https://esm.sh/bs58@6.0.0';
import { shortenWalletAddress } from '../_shared/scoreReceipt.ts';
import {
  extractMemoFromTransaction,
  validateVerifyScoreRequest,
  verifyMemoAgainstExpected,
} from './validation.ts';

function normalizeRpcTransaction(transaction: NonNullable<Awaited<ReturnType<Connection['getTransaction']>>>) {
  const message = transaction.transaction.message;
  const accountKeys = 'staticAccountKeys' in message
    ? message.staticAccountKeys.map((key) => key.toBase58())
    : message.accountKeys.map((key) => key.toBase58());

  const header = 'header' in message ? message.header : { numRequiredSignatures: 1 };
  const compiledInstructions = 'compiledInstructions' in message
    ? message.compiledInstructions
    : message.instructions;

  const instructions = compiledInstructions.map((instruction) => {
    const dataField = instruction.data as Uint8Array | string;
    const decoded =
      typeof dataField === 'string'
        ? new TextDecoder().decode(bs58.decode(dataField))
        : new TextDecoder().decode(dataField);

    return {
      programIdIndex: instruction.programIdIndex,
      data: decoded,
    };
  });

  return {
    meta: transaction.meta,
    slot: transaction.slot,
    blockTime: transaction.blockTime,
    transaction: {
      signatures: transaction.transaction.signatures,
      message: {
        header,
        staticAccountKeys: accountKeys.map((address) => ({ toBase58: () => address })),
        compiledInstructions: instructions,
      },
    },
  };
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ ok: false, error: 'Method not allowed' }, 405);
  }

  try {
    const configuredCluster = Deno.env.get('MOTION_QUIZ_CLUSTER') ?? 'devnet';
    if (configuredCluster !== 'devnet' && configuredCluster !== 'mainnet-beta') {
      return jsonResponse({ ok: false, error: 'MOTION_QUIZ_CLUSTER must be devnet or mainnet-beta' }, 500);
    }

    const rpcUrl = Deno.env.get('SOLANA_RPC_URL');
    if (!rpcUrl) {
      return jsonResponse({ ok: false, error: 'SOLANA_RPC_URL is not configured' }, 500);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ ok: false, error: 'Supabase service credentials are not configured' }, 500);
    }

    const body = await req.json();
    const parsed = validateVerifyScoreRequest(body);
    if ('error' in parsed) {
      return jsonResponse({ ok: false, error: parsed.error }, 400);
    }

    const { txSignature, expected } = parsed;

    if (expected.cluster !== 'devnet' && expected.cluster !== 'mainnet-beta') {
      return jsonResponse({ ok: false, error: 'cluster must be devnet or mainnet-beta' }, 400);
    }

    if (expected.cluster !== configuredCluster) {
      return jsonResponse({ ok: false, error: 'Cluster does not match server configuration' }, 400);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: existingRow, error: existingError } = await supabase
      .from('motion_quiz_scores')
      .select('*')
      .eq('cluster', expected.cluster)
      .eq('tx_signature', txSignature)
      .maybeSingle();

    if (existingError) {
      return jsonResponse({ ok: false, error: 'Failed to query existing score' }, 500);
    }

    if (existingRow) {
      return jsonResponse({
        ok: true,
        score: existingRow,
        txSignature,
        slot: existingRow.slot,
        blockTime: existingRow.block_time,
        duplicate: true,
      });
    }

    const connection = new Connection(rpcUrl, 'confirmed');
    const transaction = await connection.getTransaction(txSignature, {
      maxSupportedTransactionVersion: 0,
      commitment: 'confirmed',
    });

    if (!transaction) {
      return jsonResponse({ ok: false, error: 'Transaction not found on Solana RPC' }, 404);
    }

    const memoResult = extractMemoFromTransaction(
      normalizeRpcTransaction(transaction),
      txSignature,
    );
    if ('error' in memoResult) {
      return jsonResponse({ ok: false, error: memoResult.error }, 400);
    }

    const verifyResult = verifyMemoAgainstExpected(memoResult.memo, expected, memoResult.signers);
    if ('error' in verifyResult) {
      return jsonResponse({ ok: false, error: verifyResult.error }, 400);
    }

    const blockTimeIso =
      memoResult.blockTime !== null ? new Date(memoResult.blockTime * 1000).toISOString() : null;

    const insertRow = {
      wallet_address: expected.walletAddress,
      wallet_short: shortenWalletAddress(expected.walletAddress),
      cluster: expected.cluster,
      pack_id: expected.packId,
      pack_title: expected.packTitle,
      pack_content_hash: expected.packContentHash,
      score: expected.score,
      total: expected.total,
      accuracy: expected.accuracy,
      duration_ms: expected.durationMs,
      session_id: expected.sessionId,
      result_hash: expected.resultHash,
      tx_signature: txSignature,
      slot: memoResult.slot,
      block_time: blockTimeIso,
      memo_payload: verifyResult.payload,
    };

    const { data: inserted, error: insertError } = await supabase
      .from('motion_quiz_scores')
      .insert(insertRow)
      .select('*')
      .single();

    if (insertError) {
      if (insertError.code === '23505') {
        const { data: racedRow } = await supabase
          .from('motion_quiz_scores')
          .select('*')
          .eq('cluster', expected.cluster)
          .eq('tx_signature', txSignature)
          .maybeSingle();

        if (racedRow) {
          return jsonResponse({
            ok: true,
            score: racedRow,
            txSignature,
            slot: racedRow.slot,
            blockTime: racedRow.block_time,
            duplicate: true,
          });
        }
      }

      return jsonResponse({ ok: false, error: 'Failed to insert verified score' }, 500);
    }

    return jsonResponse({
      ok: true,
      score: inserted,
      txSignature,
      slot: inserted.slot,
      blockTime: inserted.block_time,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return jsonResponse({ ok: false, error: message }, 500);
  }
});
