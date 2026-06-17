import type { SolanaCluster } from '@shared/scoreReceipt';

export function solanaExplorerTxUrl(signature: string, cluster: SolanaCluster = 'devnet'): string {
  const base = `https://explorer.solana.com/tx/${encodeURIComponent(signature)}`;
  if (cluster === 'devnet') return `${base}?cluster=devnet`;
  return base;
}
