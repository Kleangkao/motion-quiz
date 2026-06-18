import type { SolanaCluster } from '@shared/scoreReceipt';
import type { StoredPhotoMomentNft } from '@/nft/types';

const STORAGE_KEY = 'motion-quiz:photo-moment-nfts';

function storageKey(record: Pick<StoredPhotoMomentNft, 'cluster' | 'walletAddress' | 'sessionId' | 'photoIndex'>): string {
  return `${record.cluster}:${record.walletAddress}:${record.sessionId}:${record.photoIndex}`;
}

function readAll(): Record<string, StoredPhotoMomentNft> {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, StoredPhotoMomentNft>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeAll(records: Record<string, StoredPhotoMomentNft>): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function isValidRecord(value: unknown): value is StoredPhotoMomentNft {
  if (!value || typeof value !== 'object') return false;
  const record = value as StoredPhotoMomentNft;
  return (
    typeof record.sessionId === 'string' &&
    typeof record.photoIndex === 'number' &&
    typeof record.walletAddress === 'string' &&
    typeof record.packId === 'string' &&
    (record.cluster === 'devnet' || record.cluster === 'mainnet-beta') &&
    typeof record.mintAddress === 'string' &&
    typeof record.txSignature === 'string' &&
    typeof record.metadataUri === 'string' &&
    typeof record.imageUri === 'string' &&
    typeof record.createdAt === 'string'
  );
}

export function getPhotoMomentNftRecord(params: {
  cluster: SolanaCluster;
  walletAddress: string;
  sessionId: string;
  photoIndex: number;
}): StoredPhotoMomentNft | null {
  const key = storageKey({
    cluster: params.cluster,
    walletAddress: params.walletAddress,
    sessionId: params.sessionId,
    photoIndex: params.photoIndex,
  });
  const record = readAll()[key];
  return isValidRecord(record) ? record : null;
}

export function savePhotoMomentNftRecord(record: StoredPhotoMomentNft): void {
  const all = readAll();
  all[storageKey(record)] = record;
  writeAll(all);
}

export function listPhotoMomentNftsForSession(params: {
  cluster: SolanaCluster;
  walletAddress: string;
  sessionId: string;
}): StoredPhotoMomentNft[] {
  const prefix = `${params.cluster}:${params.walletAddress}:${params.sessionId}:`;
  return Object.entries(readAll())
    .filter(([key, value]) => key.startsWith(prefix) && isValidRecord(value))
    .map(([, value]) => value);
}
