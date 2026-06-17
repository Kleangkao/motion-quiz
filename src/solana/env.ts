import type { SolanaCluster } from '@shared/scoreReceipt';

const DEVNET_RPC = 'https://api.devnet.solana.com';

function trimEnv(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function getSupabaseUrl(): string | undefined {
  return trimEnv(import.meta.env.VITE_SUPABASE_URL);
}

export function getSupabaseAnonKey(): string | undefined {
  return trimEnv(import.meta.env.VITE_SUPABASE_ANON_KEY);
}

export function isSupabaseConfigured(): boolean {
  return Boolean(getSupabaseUrl() && getSupabaseAnonKey());
}

export function getSolanaCluster(): SolanaCluster {
  const cluster = trimEnv(import.meta.env.VITE_SOLANA_CLUSTER);
  if (cluster === 'mainnet-beta') return 'mainnet-beta';
  return 'devnet';
}

export function getSolanaRpcUrl(): string {
  return trimEnv(import.meta.env.VITE_SOLANA_RPC_URL) ?? DEVNET_RPC;
}
