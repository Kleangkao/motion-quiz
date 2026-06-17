import { beforeEach, describe, expect, it } from 'vitest';
import { getRecordedScore, saveRecordedScore } from '@/storage/scoreRecordStorage';

describe('scoreRecordStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('persists and reloads recorded score by session id', () => {
    saveRecordedScore({
      sessionId: 'sess-1',
      txSignature: 'sig-abc',
      verified: true,
      cluster: 'devnet',
      packId: 'islanddao-challenge',
      packContentHash: 'hash-1',
      recordedAt: '2025-06-17T00:00:00.000Z',
    });

    expect(getRecordedScore('sess-1')).toMatchObject({
      txSignature: 'sig-abc',
      verified: true,
      packId: 'islanddao-challenge',
    });
    expect(getRecordedScore('missing')).toBeNull();
  });
});
