import { describe, expect, it } from 'vitest';
import { BUILTIN_LESSON_IDS, STARTER_LESSONS } from '@/data/starterLessons';
import { FEATURED_PLAY_PACK_IDS } from '@/storage/seedLessons';

describe('hackathon built-in topics', () => {
  it('seeds playable built-in packs without Ride Market', () => {
    expect(BUILTIN_LESSON_IDS).toEqual([
      'solana-basics',
      'islanddao-challenge',
      'doublezero',
      'play-solana',
      'star-atlas',
      'monkedao',
    ]);
    expect(BUILTIN_LESSON_IDS).not.toContain('ride-market');
  });

  it('features playable topics in the intended Home/Play order', () => {
    expect([...FEATURED_PLAY_PACK_IDS]).toEqual([
      'solana-basics',
      'islanddao-challenge',
      'doublezero',
      'play-solana',
      'star-atlas',
      'monkedao',
    ]);
  });

  it('gives every seeded playable pack at least one question', () => {
    for (const lesson of STARTER_LESSONS) {
      expect(lesson.questions.length).toBeGreaterThan(0);
    }
  });

  it('uses TRUE/FALSE labels for new playable topics', () => {
    const newPackIds = ['doublezero', 'play-solana', 'star-atlas', 'monkedao'] as const;
    for (const packId of newPackIds) {
      const lesson = STARTER_LESSONS.find((pack) => pack.id === packId);
      expect(lesson).toBeDefined();
      for (const question of lesson!.questions) {
        expect(question.left.label).toBe('TRUE');
        expect(question.right.label).toBe('FALSE');
      }
    }
  });
});
