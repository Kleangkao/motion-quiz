import { describe, expect, it } from 'vitest';
import { STARTER_LESSONS } from '@/data/starterLessons';
import { islanddaoChallengeLesson } from '@/data/islanddaoChallengeLesson';
import {
  buildScoreReceiptPayload,
  computePackContentHashFromLesson,
  lessonPackToPackContentForHash,
} from '@/solana/scoreReceipt';
import {
  computePackContentHash,
  computeResultHash,
  normalizeAccuracyPercent,
  parseScoreReceiptMemo,
  scoreReceiptMatchesExpected,
  serializeScoreReceiptPayload,
  validateScoreReceiptFields,
} from '@shared/scoreReceipt';

describe('score receipt hashing', () => {
  it('produces stable pack content hash for built-in packs', async () => {
    const lesson = STARTER_LESSONS.find((pack) => pack.id === 'islanddao-challenge')!;
    const hashA = await computePackContentHashFromLesson(lesson);
    const hashB = await computePackContentHash(lessonPackToPackContentForHash(lesson));
    expect(hashA).toBe(hashB);
    expect(hashA).toMatch(/^[a-f0-9]{64}$/);
  });

  it('changes pack content hash when question prompt changes', async () => {
    const original = await computePackContentHashFromLesson(islanddaoChallengeLesson);
    const edited = {
      ...islanddaoChallengeLesson,
      questions: islanddaoChallengeLesson.questions.map((question, index) =>
        index === 0 ? { ...question, prompt: 'Edited prompt' } : question,
      ),
    };
    const changed = await computePackContentHashFromLesson(edited);
    expect(changed).not.toBe(original);
  });

  it('produces stable result hash for the same inputs', async () => {
    const input = {
      sessionId: 'session-abc',
      packId: 'islanddao-challenge',
      packContentHash: 'abc123',
      walletAddress: 'Wallet1111111111111111111111111111111111',
      score: 4,
      total: 5,
      accuracy: 80,
      durationMs: 42000,
    };
    const hashA = await computeResultHash(input);
    const hashB = await computeResultHash(input);
    expect(hashA).toBe(hashB);
    expect(hashA).toMatch(/^[a-f0-9]{64}$/);
  });

  it('builds compact memo payload with expected fields', async () => {
    const lesson = STARTER_LESSONS[0];
    const packContentHash = await computePackContentHashFromLesson(lesson);
    const payload = await buildScoreReceiptPayload({
      cluster: 'devnet',
      lesson,
      packContentHash,
      sessionId: 'sess-1',
      walletAddress: 'Wallet1111111111111111111111111111111111',
      score: 3,
      totalAnswered: 4,
      skippedCount: 1,
      durationMs: 30000,
    });

    expect(payload.app).toBe('motion-quiz');
    expect(payload.type).toBe('score_receipt');
    expect(payload.version).toBe(1);
    expect(payload.total).toBe(5);
    expect(payload.accuracy).toBe(normalizeAccuracyPercent(3, 5));
    expect(validateScoreReceiptFields(payload)).toBeNull();

    const memo = serializeScoreReceiptPayload(payload);
    expect(memo).not.toMatch(/\s{2,}/);
    expect(memo.length).toBeLessThan(900);
    expect(parseScoreReceiptMemo(memo)).toEqual(payload);
  });

  it('keeps serialized memo under 900 bytes for worst-case featured packs', async () => {
    const realisticWallet = '7EqQdEULxWcraVX7hKbj1GJNdKnv7dK9xPq2mR4sT8vW';
    const realisticSessionId = 'a1b2c3d4e5f6789012345678';

    for (const lesson of STARTER_LESSONS) {
      const packContentHash = await computePackContentHashFromLesson(lesson);
      const payload = await buildScoreReceiptPayload({
        cluster: 'devnet',
        lesson,
        packContentHash,
        sessionId: realisticSessionId,
        walletAddress: realisticWallet,
        score: lesson.questions.length,
        totalAnswered: lesson.questions.length,
        skippedCount: 0,
        durationMs: 3_600_000,
      });

      const memo = serializeScoreReceiptPayload(payload);
      expect(memo.length).toBeLessThan(900);
      expect(memo).toBe(JSON.stringify(payload));
    }
  });

  it('matches expected verification fields', async () => {
    const lesson = STARTER_LESSONS[1];
    const packContentHash = await computePackContentHashFromLesson(lesson);
    const payload = await buildScoreReceiptPayload({
      cluster: 'devnet',
      lesson,
      packContentHash,
      sessionId: 'sess-2',
      walletAddress: 'Wallet2222222222222222222222222222222222',
      score: 5,
      totalAnswered: 5,
      skippedCount: 0,
      durationMs: 12000,
    });

    const expected = {
      cluster: payload.cluster,
      walletAddress: payload.walletAddress,
      packId: payload.packId,
      packTitle: payload.packTitle,
      packContentHash: payload.packContentHash,
      sessionId: payload.sessionId,
      score: payload.score,
      total: payload.total,
      accuracy: payload.accuracy,
      durationMs: payload.durationMs,
      resultHash: payload.resultHash,
    };

    expect(scoreReceiptMatchesExpected(payload, expected)).toBe(true);
  });
});
