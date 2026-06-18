import type { SolanaCluster } from '@shared/scoreReceipt';
import {
  getSolanaCluster as getLegacySolanaCluster,
  getSolanaRpcUrl,
  getSupabaseAnonKey,
  getSupabaseUrl,
  isSupabaseConfigured,
} from '@/solana/env';

export type SolanaConfigErrorCode =
  | 'cluster_unsupported'
  | 'cluster_missing'
  | 'rpc_missing'
  | 'supabase_missing'
  | 'nft_minting_disabled';

export interface SolanaAppConfig {
  cluster: SolanaCluster;
  rpcUrl: string;
  clusterLabel: string;
  isProductionCluster: boolean;
  scoreRecordingEnabled: boolean;
  nftMintingEnabled: boolean;
  supabaseConfigured: boolean;
  appUrl: string | null;
}

export type SolanaConfigResult =
  | { ok: true; config: SolanaAppConfig }
  | { ok: false; error: SolanaConfigErrorCode; message: string };

const SUPPORTED_CLUSTERS: SolanaCluster[] = ['devnet', 'mainnet-beta'];

function trimEnv(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function parseClusterFromEnv(): SolanaCluster | null {
  const raw = trimEnv(import.meta.env.VITE_SOLANA_CLUSTER);
  if (!raw) return null;
  if (SUPPORTED_CLUSTERS.includes(raw as SolanaCluster)) {
    return raw as SolanaCluster;
  }
  return null;
}

export function clusterLabel(cluster: SolanaCluster): string {
  return cluster === 'mainnet-beta' ? 'Solana mainnet' : 'Solana devnet';
}

export function clusterShortLabel(cluster: SolanaCluster): string {
  return cluster === 'mainnet-beta' ? 'mainnet' : 'devnet';
}

export function isNftMintingEnabledFlag(): boolean {
  const raw = trimEnv(import.meta.env.VITE_NFT_MINTING_ENABLED);
  if (raw === 'false' || raw === '0') return false;
  return true;
}

export function getAppUrl(): string | null {
  return trimEnv(import.meta.env.VITE_APP_URL) ?? null;
}

export function getSolanaAppConfig(): SolanaConfigResult {
  const parsed = parseClusterFromEnv();
  const cluster = parsed ?? getLegacySolanaCluster();

  if (!parsed && trimEnv(import.meta.env.VITE_SOLANA_CLUSTER)) {
    return {
      ok: false,
      error: 'cluster_unsupported',
      message: 'Unsupported Solana cluster. Use devnet or mainnet-beta.',
    };
  }

  if (!SUPPORTED_CLUSTERS.includes(cluster)) {
    return {
      ok: false,
      error: 'cluster_unsupported',
      message: 'Unsupported Solana cluster. Use devnet or mainnet-beta.',
    };
  }

  const rpcUrl = getSolanaRpcUrl();
  if (!rpcUrl) {
    return {
      ok: false,
      error: 'rpc_missing',
      message: 'Solana RPC URL is not configured.',
    };
  }

  const supabaseConfigured = isSupabaseConfigured();
  const nftMintingEnabled = isNftMintingEnabledFlag() && supabaseConfigured;

  return {
    ok: true,
    config: {
      cluster,
      rpcUrl,
      clusterLabel: clusterLabel(cluster),
      isProductionCluster: cluster === 'mainnet-beta',
      scoreRecordingEnabled: supabaseConfigured,
      nftMintingEnabled,
      supabaseConfigured,
      appUrl: getAppUrl(),
    },
  };
}

export function solanaConfigErrorMessage(code: SolanaConfigErrorCode): string {
  switch (code) {
    case 'cluster_unsupported':
      return 'Unsupported Solana cluster. Use devnet or mainnet-beta.';
    case 'cluster_missing':
      return 'Solana cluster is not configured.';
    case 'rpc_missing':
      return 'Solana RPC URL is not configured.';
    case 'supabase_missing':
      return 'NFT storage is not configured. Add Supabase env vars.';
    case 'nft_minting_disabled':
      return 'Photo Moment NFT minting is disabled in this environment.';
    default:
      return 'Solana is not configured for this action.';
  }
}

export function requireSupabaseForNft(): SolanaConfigResult {
  if (!getSupabaseUrl() || !getSupabaseAnonKey()) {
    return {
      ok: false,
      error: 'supabase_missing',
      message: solanaConfigErrorMessage('supabase_missing'),
    };
  }
  return getSolanaAppConfig();
}
