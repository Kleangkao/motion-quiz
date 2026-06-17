import type { SolanaCluster } from '@shared/scoreReceipt';

export interface TopicLeaderboardRow {
  id: string;
  walletAddress: string;
  walletShort: string;
  cluster: SolanaCluster;
  packId: string;
  packTitle: string;
  packContentHash: string;
  score: number;
  total: number;
  accuracy: number;
  durationMs: number | null;
  sessionId: string;
  resultHash: string;
  txSignature: string;
  slot: number | null;
  blockTime: string | null;
  createdAt: string;
  rank: number;
}

export interface RecordedScoreRow {
  id: string;
  walletAddress: string;
  walletShort: string;
  cluster: SolanaCluster;
  packId: string;
  packTitle: string;
  packContentHash: string;
  score: number;
  total: number;
  accuracy: number;
  durationMs: number | null;
  sessionId: string;
  resultHash: string;
  txSignature: string;
  slot: number | null;
  blockTime: string | null;
  createdAt: string;
}

export type LeaderboardClientError = 'not_configured' | 'network' | 'invalid_response';

export interface LeaderboardTopicOption {
  packId: string;
  title: string;
  packContentHash: string;
}
