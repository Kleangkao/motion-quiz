import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BUILTIN_LESSON_IDS, STARTER_LESSONS } from '@/data/starterLessons';

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
      id === 'seeker_mobile_basics' ? STARTER_LESSONS.find((l) => l.id === id) : undefined,
    );

    const result = await ensureStarterLessons();

    expect(result.insertedIds).toEqual(
      BUILTIN_LESSON_IDS.filter((id) => id !== 'seeker_mobile_basics'),
    );
    expect(put).toHaveBeenCalledTimes(BUILTIN_LESSON_IDS.length - 1);
    expect(put).not.toHaveBeenCalledWith(
      expect.objectContaining({ id: 'seeker_mobile_basics' }),
    );
  });

  it('does not overwrite existing built-in or user-edited packs', async () => {
    const userEdited = {
      ...STARTER_LESSONS[0],
      title: 'My Custom Solana Basics',
      description: 'Edited locally',
    };
    getLesson.mockImplementation(async (id: string) =>
      id === 'solana-basics' ? userEdited : undefined,
    );

    const result = await ensureStarterLessons();

    expect(result.insertedIds).not.toContain('solana-basics');
    expect(put).not.toHaveBeenCalledWith(expect.objectContaining({ id: 'solana-basics' }));
  });

  it('is idempotent on repeated runs', async () => {
    getLesson.mockImplementation(async (id: string) =>
      STARTER_LESSONS.find((lesson) => lesson.id === id),
    );

    const first = await ensureStarterLessons();
    const second = await ensureStarterLessons();

    expect(first.insertedIds).toEqual([]);
    expect(second.insertedIds).toEqual([]);
    expect(put).not.toHaveBeenCalled();
  });
});
