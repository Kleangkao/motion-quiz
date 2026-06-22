import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BUILTIN_LESSON_IDS, STARTER_LESSONS } from '@/data/starterLessons';
import { doublezeroLesson } from '@/data/doublezeroLesson';
import { islanddaoChallengeLesson } from '@/data/islanddaoChallengeLesson';
import { monkedaoLesson } from '@/data/monkedaoLesson';
import { playSolanaLesson } from '@/data/playSolanaLesson';
import { rideMarketLesson } from '@/data/rideMarketLesson';
import { solanaBasicsLesson } from '@/data/solanaBasicsLesson';
import { starAtlasLesson } from '@/data/starAtlasLesson';
import type { LessonPack } from '@/storage/types';
import { isBuiltinStarterLessonId } from '@/storage/starterLessonSync';

const { put, getLesson } = vi.hoisted(() => ({
  put: vi.fn(),
  getLesson: vi.fn(),
}));

vi.mock('@/storage/db', () => ({
  db: {
    lessons: {
      put,
    },
  },
}));

vi.mock('@/storage/lessonStorage', () => ({
  getLesson,
}));

import { ensureStarterLessons } from '@/storage/seedLessons';

function mockAllCanonicalExcept(overrides: Record<string, LessonPack | undefined>) {
  getLesson.mockImplementation(async (id: string) => {
    if (id in overrides) return overrides[id];
    return STARTER_LESSONS.find((lesson) => lesson.id === id);
  });
}

describe('ensureStarterLessons', () => {
  beforeEach(() => {
    put.mockReset();
    getLesson.mockReset();
  });

  it('inserts only missing built-in packs by stable ID', async () => {
    getLesson.mockImplementation(async (id: string) =>
      id === 'solana-basics' ? STARTER_LESSONS.find((l) => l.id === id) : undefined,
    );

    const result = await ensureStarterLessons();

    expect(result.insertedIds).toEqual(
      BUILTIN_LESSON_IDS.filter((id) => id !== 'solana-basics'),
    );
    expect(result.updatedIds).toEqual([]);
    expect(put).toHaveBeenCalledTimes(BUILTIN_LESSON_IDS.length - 1);
    expect(put).not.toHaveBeenCalledWith(
      expect.objectContaining({ id: 'solana-basics' }),
    );
  });

  it('does not overwrite solana-basics when canonical content still matches', async () => {
    mockAllCanonicalExcept({});

    const result = await ensureStarterLessons();

    expect(result.insertedIds).not.toContain('solana-basics');
    expect(result.updatedIds).toEqual([]);
    expect(put).not.toHaveBeenCalledWith(expect.objectContaining({ id: 'solana-basics' }));
  });

  it('syncs solana-basics when IndexedDB still has old built-in title', async () => {
    const oldTitle = {
      ...solanaBasicsLesson,
      title: 'Solana Basics',
    };
    mockAllCanonicalExcept({ 'solana-basics': oldTitle });

    const result = await ensureStarterLessons();

    expect(result.updatedIds).toEqual(['solana-basics']);
    expect(put).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'solana-basics',
        title: 'Solana',
        questions: solanaBasicsLesson.questions,
        createdAt: oldTitle.createdAt,
      }),
    );
  });

  it('syncs solana-basics when IndexedDB still has old built-in questions', async () => {
    const oldSolana = {
      ...solanaBasicsLesson,
      questions: [
        {
          ...solanaBasicsLesson.questions[0],
          id: 'solana_basics_old',
          prompt: 'Old Solana question that should be replaced',
        },
      ],
    };
    mockAllCanonicalExcept({ 'solana-basics': oldSolana });

    const result = await ensureStarterLessons();

    expect(result.updatedIds).toEqual(['solana-basics']);
    expect(put).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'solana-basics',
        questions: solanaBasicsLesson.questions,
        createdAt: oldSolana.createdAt,
      }),
    );
  });

  it('is idempotent on repeated runs', async () => {
    mockAllCanonicalExcept({});

    const first = await ensureStarterLessons();
    const second = await ensureStarterLessons();

    expect(first.insertedIds).toEqual([]);
    expect(first.updatedIds).toEqual([]);
    expect(second.insertedIds).toEqual([]);
    expect(second.updatedIds).toEqual([]);
    expect(put).not.toHaveBeenCalled();
  });

  it('syncs IslandDAO Challenge when IndexedDB still has old built-in questions', async () => {
    const oldIslandDao = {
      ...islanddaoChallengeLesson,
      questions: [
        ...islanddaoChallengeLesson.questions,
        {
          ...islanddaoChallengeLesson.questions[0],
          id: 'islanddao_q_old',
          prompt: 'Old residency question that should be removed',
        },
      ],
    };
    mockAllCanonicalExcept({ 'islanddao-challenge': oldIslandDao });

    const result = await ensureStarterLessons();

    expect(result.insertedIds).toEqual([]);
    expect(result.updatedIds).toEqual(['islanddao-challenge']);
    expect(put).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'islanddao-challenge',
        questions: islanddaoChallengeLesson.questions,
        createdAt: oldIslandDao.createdAt,
      }),
    );
  });

  it('does not sync IslandDAO when content already matches canonical pack', async () => {
    mockAllCanonicalExcept({});

    const result = await ensureStarterLessons();

    expect(result.updatedIds).toEqual([]);
    expect(put).not.toHaveBeenCalled();
  });

  it('syncs IslandDAO when prompts match but choice images changed', async () => {
    const oldIslandDao = {
      ...islanddaoChallengeLesson,
      questions: islanddaoChallengeLesson.questions.map((q) => ({
        ...q,
        left: {
          ...q.left,
          image: { kind: 'external' as const, value: '/legacy-left.png' },
        },
        right: {
          ...q.right,
          image: { kind: 'external' as const, value: '/legacy-right.png' },
        },
      })),
    };
    mockAllCanonicalExcept({ 'islanddao-challenge': oldIslandDao });

    const result = await ensureStarterLessons();

    expect(result.updatedIds).toEqual(['islanddao-challenge']);
    expect(put).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'islanddao-challenge',
        questions: islanddaoChallengeLesson.questions,
      }),
    );
  });

  it('syncs built-in Play copy when IndexedDB still has an old description', async () => {
    const oldRideMarket = {
      ...rideMarketLesson,
      description: 'TRUE/FALSE quiz about Ride Markets conviction trading.',
    };
    mockAllCanonicalExcept({ 'ride-market': oldRideMarket });

    const result = await ensureStarterLessons();

    expect(result.updatedIds).toContain('ride-market');
    expect(put).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'ride-market',
        description: 'Trade calls, YES/NO choices, and conviction markets.',
        questions: rideMarketLesson.questions,
        createdAt: oldRideMarket.createdAt,
      }),
    );
  });

  it('syncs ride-market when IndexedDB still has nine old questions', async () => {
    const oldRideMarket = {
      ...rideMarketLesson,
      questions: [
        ...rideMarketLesson.questions,
        {
          ...rideMarketLesson.questions[0],
          id: 'ride_market_q08',
          prompt: 'Legacy Ride Markets question eight',
        },
        {
          ...rideMarketLesson.questions[1],
          id: 'ride_market_q09',
          prompt: 'Legacy Ride Markets question nine',
        },
      ],
    };
    mockAllCanonicalExcept({ 'ride-market': oldRideMarket });

    const result = await ensureStarterLessons();

    expect(result.updatedIds).toContain('ride-market');
    expect(put).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'ride-market',
        questions: rideMarketLesson.questions,
      }),
    );
    expect(rideMarketLesson.questions).toHaveLength(7);
  });

  it('syncs doublezero when IndexedDB still has old built-in questions', async () => {
    const oldDoubleZero = {
      ...doublezeroLesson,
      questions: [
        {
          ...doublezeroLesson.questions[0],
          prompt: 'DoubleZero helps distributed systems communicate',
        },
      ],
    };
    mockAllCanonicalExcept({ doublezero: oldDoubleZero });

    const result = await ensureStarterLessons();

    expect(result.updatedIds).toContain('doublezero');
    expect(put).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'doublezero',
        questions: doublezeroLesson.questions,
      }),
    );
    expect(doublezeroLesson.questions).toHaveLength(6);
  });

  it('syncs play-solana when IndexedDB still has old built-in questions', async () => {
    const oldPlaySolana = {
      ...playSolanaLesson,
      questions: playSolanaLesson.questions.map((question, index) =>
        index === 0
          ? { ...question, prompt: 'Play Solana is a browser extension' }
          : question,
      ),
    };
    mockAllCanonicalExcept({ 'play-solana': oldPlaySolana });

    const result = await ensureStarterLessons();

    expect(result.updatedIds).toContain('play-solana');
    expect(put).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'play-solana',
        questions: playSolanaLesson.questions,
      }),
    );
    expect(playSolanaLesson.questions).toHaveLength(7);
  });

  it('syncs monkedao when IndexedDB still has old built-in questions', async () => {
    const oldMonkeDao = {
      ...monkedaoLesson,
      questions: [
        {
          ...monkedaoLesson.questions[0],
          prompt: 'Monkedao is only about trading NFTs',
        },
      ],
    };
    mockAllCanonicalExcept({ monkedao: oldMonkeDao });

    const result = await ensureStarterLessons();

    expect(result.updatedIds).toContain('monkedao');
    expect(put).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'monkedao',
        questions: monkedaoLesson.questions,
      }),
    );
    expect(monkedaoLesson.questions).toHaveLength(7);
  });

  it('does not sync star-atlas when saved content already matches canonical pack', async () => {
    mockAllCanonicalExcept({});

    const result = await ensureStarterLessons();

    expect(result.updatedIds).not.toContain('star-atlas');
    expect(starAtlasLesson.questions).toHaveLength(6);
  });

  it('does not overwrite custom topics that are not built-in starter lesson IDs', async () => {
    const customTopic = {
      ...rideMarketLesson,
      id: 'my-custom-topic',
      title: 'Custom Topic',
      description: 'User-authored description should stay.',
    };
    getLesson.mockImplementation(async (id: string) => {
      if (id === 'my-custom-topic') return customTopic;
      return STARTER_LESSONS.find((lesson) => lesson.id === id);
    });

    await ensureStarterLessons();

    expect(isBuiltinStarterLessonId('my-custom-topic')).toBe(false);
    expect(put).not.toHaveBeenCalledWith(expect.objectContaining({ id: 'my-custom-topic' }));
  });
});
