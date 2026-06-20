import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BUILTIN_LESSON_IDS, STARTER_LESSONS } from '@/data/starterLessons';
import { islanddaoChallengeLesson } from '@/data/islanddaoChallengeLesson';
import { rideMarketLesson } from '@/data/rideMarketLesson';
import { solanaBasicsLesson } from '@/data/solanaBasicsLesson';
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
    getLesson.mockImplementation(async (id: string) =>
      id === 'solana-basics' ? STARTER_LESSONS.find((l) => l.id === 'solana-basics') : undefined,
    );

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
    getLesson.mockImplementation(async (id: string) => {
      if (id === 'solana-basics') return oldTitle;
      return STARTER_LESSONS.find((lesson) => lesson.id === id);
    });

    const result = await ensureStarterLessons();

    expect(result.updatedIds).toEqual(['solana-basics']);
    expect(put).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'solana-basics',
        title: 'Solana',
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
    getLesson.mockImplementation(async (id: string) => {
      if (id === 'solana-basics') return oldSolana;
      return STARTER_LESSONS.find((lesson) => lesson.id === id);
    });

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
    getLesson.mockImplementation(async (id: string) =>
      STARTER_LESSONS.find((lesson) => lesson.id === id),
    );

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
    getLesson.mockImplementation(async (id: string) => {
      if (id === 'islanddao-challenge') return oldIslandDao;
      return STARTER_LESSONS.find((lesson) => lesson.id === id);
    });

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
    getLesson.mockImplementation(async (id: string) =>
      STARTER_LESSONS.find((lesson) => lesson.id === id),
    );

    const result = await ensureStarterLessons();

    expect(result.updatedIds).toEqual([]);
    expect(put).not.toHaveBeenCalled();
  });

  it('syncs IslandDAO when prompts match but choice images changed', async () => {
    const oldIslandDao = {
      ...islanddaoChallengeLesson,
      questions: islanddaoChallengeLesson.questions.map((q) => ({
        ...q,
        left: { ...q.left, image: { type: 'url' as const, value: '/legacy-left.png' } },
        right: { ...q.right, image: { type: 'url' as const, value: '/legacy-right.png' } },
      })),
    };
    getLesson.mockImplementation(async (id: string) => {
      if (id === 'islanddao-challenge') return oldIslandDao;
      return STARTER_LESSONS.find((lesson) => lesson.id === id);
    });

    const result = await ensureStarterLessons();

    expect(result.updatedIds).toEqual(['islanddao-challenge']);
    expect(put).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'islanddao-challenge',
        questions: islanddaoChallengeLesson.questions,
      }),
    );
  });

  it('syncs built-in Play metadata when IndexedDB still has an old description', async () => {
    const oldRideMarket = {
      ...rideMarketLesson,
      description: 'TRUE/FALSE quiz about Ride Markets conviction trading.',
    };
    getLesson.mockImplementation(async (id: string) => {
      if (id === 'ride-market') return oldRideMarket;
      return STARTER_LESSONS.find((lesson) => lesson.id === id);
    });

    const result = await ensureStarterLessons();

    expect(result.updatedIds).toContain('ride-market');
    expect(put).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'ride-market',
        description: 'Trade calls, YES/NO choices, and conviction markets.',
        questions: oldRideMarket.questions,
        createdAt: oldRideMarket.createdAt,
      }),
    );
  });

  it('syncs IslandDAO description without changing saved questions when prompts already match', async () => {
    const oldIslandDao = {
      ...islanddaoChallengeLesson,
      description: 'TRUE/FALSE quiz about IslandDAO and the Solana builder community.',
    };
    getLesson.mockImplementation(async (id: string) => {
      if (id === 'islanddao-challenge') return oldIslandDao;
      return STARTER_LESSONS.find((lesson) => lesson.id === id);
    });

    const result = await ensureStarterLessons();

    expect(result.updatedIds).toContain('islanddao-challenge');
    expect(put).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'islanddao-challenge',
        description: 'IslandDAO, builders, events, and community quests.',
        questions: oldIslandDao.questions,
      }),
    );
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
