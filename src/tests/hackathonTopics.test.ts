import { describe, expect, it } from 'vitest';
import { BUILTIN_LESSON_IDS, STARTER_LESSONS } from '@/data/starterLessons';
import { RIDE_MARKET_ID, rideMarketLesson } from '@/data/rideMarketLesson';
import { FEATURED_PLAY_PACK_IDS } from '@/storage/seedLessons';

const PLAY_TOPIC_ORDER = [
  'solana-basics',
  'islanddao-challenge',
  'ride-market',
  'doublezero',
  'play-solana',
  'star-atlas',
  'monkedao',
] as const;

describe('hackathon built-in topics', () => {
  it('seeds playable built-in packs including Ride Markets', () => {
    expect(BUILTIN_LESSON_IDS).toEqual([...PLAY_TOPIC_ORDER]);
    expect(BUILTIN_LESSON_IDS).toContain(RIDE_MARKET_ID);
  });

  it('features playable topics in the intended Play order', () => {
    expect([...FEATURED_PLAY_PACK_IDS]).toEqual([...PLAY_TOPIC_ORDER]);
  });

  it('gives every seeded playable pack at least one question', () => {
    for (const lesson of STARTER_LESSONS) {
      expect(lesson.questions.length).toBeGreaterThan(0);
    }
  });

  it('Ride Markets has nine TRUE/FALSE questions', () => {
    expect(rideMarketLesson.questions).toHaveLength(9);
    for (const question of rideMarketLesson.questions) {
      expect(question.left.label).toBe('TRUE');
      expect(question.right.label).toBe('FALSE');
    }
  });

  it('uses TRUE/FALSE labels for other hackathon topics', () => {
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
