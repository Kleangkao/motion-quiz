import type { SolanaCluster } from '@shared/scoreReceipt';

const STORAGE_KEY = 'motion-quiz:recorded-scores';

export interface RecordedScoreReceipt {
  sessionId: string;
  txSignature: string;
  verified: boolean;
  cluster: SolanaCluster;
  packId: string;
  packContentHash: string;
  recordedAt: string;
}

function readAll(): Record<string, RecordedScoreReceipt> {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, RecordedScoreReceipt>;
  } catch {
    return {};
  }
}

function writeAll(records: Record<string, RecordedScoreReceipt>): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export function getRecordedScore(sessionId: string): RecordedScoreReceipt | null {
  return readAll()[sessionId] ?? null;
}

export function saveRecordedScore(record: RecordedScoreReceipt): void {
  const all = readAll();
  all[record.sessionId] = record;
  writeAll(all);
}
