import type { SolanaCluster } from '@shared/scoreReceipt';
import { solanaExplorerTxUrl } from '@/solana/explorer';
import { shortenWalletAddress } from '@/solana/walletAddress';
import type { RecordedScoreRow, TopicLeaderboardRow } from './types';

export function formatScoreLine(score: number, total: number): string {
  return `${score}/${total}`;
}

export function formatAccuracyPercent(accuracy: number): string {
  const rounded = Math.round(accuracy * 100) / 100;
  return `${Number(rounded.toFixed(2))}%`;
}

export function formatDurationMs(durationMs: number | null | undefined): string | null {
  if (durationMs == null || durationMs < 0) return null;
  const totalSeconds = Math.round(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

export function formatRecordedTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
}

export function formatWalletDisplay(address: string | null | undefined, chars = 4): string {
  return shortenWalletAddress(address, chars);
}

export function explorerUrlForTx(txSignature: string, cluster: SolanaCluster): string {
  return solanaExplorerTxUrl(txSignature, cluster);
}

export function assignLeaderboardRanks<T extends Omit<TopicLeaderboardRow, 'rank'>>(
  rows: T[],
): TopicLeaderboardRow[] {
  return rows.map((row, index) => ({ ...row, rank: index + 1 }));
}

export function pickRecordedDisplayTime(row: RecordedScoreRow): string {
  return formatRecordedTime(row.blockTime ?? row.createdAt);
}
