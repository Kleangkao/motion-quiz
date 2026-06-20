import { describe, expect, it } from 'vitest';
import { BUILTIN_LESSON_IDS, STARTER_LESSONS } from '@/data/starterLessons';
import { RIDE_MARKET_ID, rideMarketLesson } from '@/data/rideMarketLesson';
import { solanaBasicsLesson } from '@/data/solanaBasicsLesson';
import { starAtlasLesson } from '@/data/starAtlasLesson';
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

  it('uses TRUE/FALSE labels for hackathon topics without mixed formats', () => {
    const tfOnlyPackIds = ['doublezero', 'play-solana', 'monkedao'] as const;
    for (const packId of tfOnlyPackIds) {
      const lesson = STARTER_LESSONS.find((pack) => pack.id === packId);
      expect(lesson).toBeDefined();
      for (const question of lesson!.questions) {
        expect(question.left.label).toBe('TRUE');
        expect(question.right.label).toBe('FALSE');
      }
    }
  });

  it('Star Atlas has six questions including the CEO A/B item', () => {
    expect(starAtlasLesson.questions).toHaveLength(6);

    const ceoQuestion = starAtlasLesson.questions.find(
      (question) => question.prompt === 'Who is the CEO of Star Atlas?',
    );
    expect(ceoQuestion).toBeDefined();
    expect(ceoQuestion!.left.label).toBe('Michael Wagner');
    expect(ceoQuestion!.right.label).toBe('Anonymous guy');
    expect(ceoQuestion!.correctSide).toBe('left');
  });

  it('Solana has nine TRUE/FALSE questions with updated copy', () => {
    expect(solanaBasicsLesson.questions).toHaveLength(9);
    expect(solanaBasicsLesson.questions.map((question) => question.prompt)).toEqual([
      'You can share your wallet address',
      'You can share your seed phrase',
      'Connecting your wallet moves your money',
      'You should read before you sign',
      'Devnet SOL is real money',
      'Mainnet uses real SOL',
      'RPC helps apps talk to Solana',
      'Seeker includes Seed Vault Wallet',
      'You need a Seeker phone to start building',
    ]);

    for (const question of solanaBasicsLesson.questions) {
      expect(question.left.label).toBe('TRUE');
      expect(question.right.label).toBe('FALSE');
    }
  });
});
