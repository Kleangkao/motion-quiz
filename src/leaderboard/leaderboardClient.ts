import type { SolanaCluster } from '@shared/scoreReceipt';
import { getSupabaseAnonKey, getSupabaseUrl, isSupabaseConfigured } from '@/solana/env';
import { assignLeaderboardRanks } from './leaderboardFormat';
import type { LeaderboardClientError, RecordedScoreRow, TopicLeaderboardRow } from './types';

interface SupabaseConfig {
  url: string;
  anonKey: string;
}

function getSupabaseConfig(): SupabaseConfig | null {
  if (!isSupabaseConfigured()) return null;
  const url = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

function supabaseHeaders(config: SupabaseConfig): HeadersInit {
  return {
    apikey: config.anonKey,
    Authorization: `Bearer ${config.anonKey}`,
  };
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function asCluster(value: unknown): SolanaCluster | null {
  return value === 'devnet' || value === 'mainnet-beta' ? value : null;
}

function parseTopicLeaderboardRow(raw: unknown): Omit<TopicLeaderboardRow, 'rank'> | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;

  const cluster = asCluster(row.cluster);
  const walletAddress = asString(row.wallet_address);
  const packId = asString(row.pack_id);
  const packContentHash = asString(row.pack_content_hash);
  const txSignature = asString(row.tx_signature);
  const id = asString(row.id);
  const score = asNumber(row.score);
  const total = asNumber(row.total);
  const accuracy = asNumber(row.accuracy);

  if (
    !cluster ||
    !walletAddress ||
    !packId ||
    !packContentHash ||
    !txSignature ||
    !id ||
    score == null ||
    total == null ||
    accuracy == null
  ) {
    return null;
  }

  return {
    id,
    walletAddress,
    walletShort: asString(row.wallet_short) ?? walletAddress.slice(0, 8),
    cluster,
    packId,
    packTitle: asString(row.pack_title) ?? packId,
    packContentHash,
    score,
    total,
    accuracy,
    durationMs: asNumber(row.duration_ms),
    sessionId: asString(row.session_id) ?? '',
    resultHash: asString(row.result_hash) ?? '',
    txSignature,
    slot: asNumber(row.slot),
    blockTime: asString(row.block_time),
    createdAt: asString(row.created_at) ?? new Date(0).toISOString(),
  };
}

function parseRecordedScoreRow(raw: unknown): RecordedScoreRow | null {
  const parsed = parseTopicLeaderboardRow(raw);
  return parsed;
}

async function supabaseGet<T>(
  config: SupabaseConfig,
  path: string,
  parseRow: (raw: unknown) => T | null,
): Promise<{ ok: true; rows: T[] } | { ok: false; error: LeaderboardClientError }> {
  try {
    const response = await fetch(`${config.url}/rest/v1/${path}`, {
      headers: supabaseHeaders(config),
    });

    if (!response.ok) {
      return { ok: false, error: 'network' };
    }

    const data = (await response.json()) as unknown;
    if (!Array.isArray(data)) {
      return { ok: false, error: 'invalid_response' };
    }

    const rows: T[] = [];
    for (const item of data) {
      const row = parseRow(item);
      if (row) rows.push(row);
    }

    return { ok: true, rows };
  } catch {
    return { ok: false, error: 'network' };
  }
}

function leaderboardQueryPath(params: {
  packId: string;
  packContentHash: string;
  cluster: SolanaCluster;
  limit: number;
}): string {
  const search = new URLSearchParams({
    select:
      'id,wallet_address,wallet_short,cluster,pack_id,pack_title,pack_content_hash,score,total,accuracy,duration_ms,session_id,result_hash,tx_signature,slot,block_time,created_at',
    cluster: `eq.${params.cluster}`,
    pack_id: `eq.${params.packId}`,
    pack_content_hash: `eq.${params.packContentHash}`,
    order:
      'accuracy.desc,score.desc,duration_ms.asc.nullslast,block_time.asc.nullslast,created_at.asc',
    limit: String(params.limit),
  });

  return `motion_quiz_topic_leaderboard?${search.toString()}`;
}

function recordedScoresQueryPath(params: {
  walletAddress: string;
  cluster: SolanaCluster;
  limit: number;
  packId?: string;
  packContentHash?: string;
}): string {
  const search = new URLSearchParams({
    select:
      'id,wallet_address,wallet_short,cluster,pack_id,pack_title,pack_content_hash,score,total,accuracy,duration_ms,session_id,result_hash,tx_signature,slot,block_time,created_at',
    wallet_address: `eq.${params.walletAddress}`,
    cluster: `eq.${params.cluster}`,
    order: 'created_at.desc',
    limit: String(params.limit),
  });

  if (params.packId) {
    search.set('pack_id', `eq.${params.packId}`);
  }
  if (params.packContentHash) {
    search.set('pack_content_hash', `eq.${params.packContentHash}`);
  }

  return `motion_quiz_scores?${search.toString()}`;
}

export async function fetchTopicLeaderboard(params: {
  packId: string;
  packContentHash: string;
  cluster: SolanaCluster;
  limit?: number;
}): Promise<
  { ok: true; rows: TopicLeaderboardRow[] } | { ok: false; error: LeaderboardClientError }
> {
  const config = getSupabaseConfig();
  if (!config) return { ok: false, error: 'not_configured' };

  const result = await supabaseGet(
    config,
    leaderboardQueryPath({
      packId: params.packId,
      packContentHash: params.packContentHash,
      cluster: params.cluster,
      limit: params.limit ?? 50,
    }),
    parseTopicLeaderboardRow,
  );

  if (!result.ok) return result;
  return { ok: true, rows: assignLeaderboardRanks(result.rows) };
}

export async function fetchMyRecordedScores(params: {
  walletAddress: string;
  cluster: SolanaCluster;
  limit?: number;
}): Promise<
  { ok: true; rows: RecordedScoreRow[] } | { ok: false; error: LeaderboardClientError }
> {
  const config = getSupabaseConfig();
  if (!config) return { ok: false, error: 'not_configured' };

  const walletAddress = params.walletAddress.trim();
  if (!walletAddress) {
    return { ok: true, rows: [] };
  }

  return supabaseGet(
    config,
    recordedScoresQueryPath({
      walletAddress,
      cluster: params.cluster,
      limit: params.limit ?? 20,
    }),
    parseRecordedScoreRow,
  );
}

export async function fetchMyScoresForTopic(params: {
  walletAddress: string;
  packId: string;
  packContentHash: string;
  cluster: SolanaCluster;
  limit?: number;
}): Promise<
  { ok: true; rows: RecordedScoreRow[] } | { ok: false; error: LeaderboardClientError }
> {
  const config = getSupabaseConfig();
  if (!config) return { ok: false, error: 'not_configured' };

  const walletAddress = params.walletAddress.trim();
  if (!walletAddress) {
    return { ok: true, rows: [] };
  }

  return supabaseGet(
    config,
    recordedScoresQueryPath({
      walletAddress,
      cluster: params.cluster,
      packId: params.packId,
      packContentHash: params.packContentHash,
      limit: params.limit ?? 10,
    }),
    parseRecordedScoreRow,
  );
}

export function leaderboardErrorMessage(error: LeaderboardClientError): string {
  switch (error) {
    case 'not_configured':
      return 'Leaderboard is not configured yet.';
    case 'network':
      return 'Could not load leaderboard.';
    case 'invalid_response':
      return 'Could not load leaderboard.';
    default:
      return 'Could not load leaderboard.';
  }
}
