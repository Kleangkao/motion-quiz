import { describe, expect, it } from 'vitest';
import type { QuizQuestion } from '@/storage/types';
import { BUILTIN_LESSON_IDS, STARTER_LESSONS } from '@/data/starterLessons';
import { doublezeroLesson } from '@/data/doublezeroLesson';
import { islanddaoChallengeLesson } from '@/data/islanddaoChallengeLesson';
import { monkedaoLesson } from '@/data/monkedaoLesson';
import { playSolanaLesson } from '@/data/playSolanaLesson';
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

function expectTrueFalseSet(
  questions: QuizQuestion[],
  entries: ReadonlyArray<{ prompt: string; answer: boolean }>,
) {
  expect(questions).toHaveLength(entries.length);
  entries.forEach(({ prompt, answer }, index) => {
    const question = questions[index];
    expect(question.prompt).toBe(prompt);
    expect(question.left.label).toBe('TRUE');
    expect(question.right.label).toBe('FALSE');
    expect(question.correctSide).toBe(answer ? 'left' : 'right');
  });
}

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

  it('Solana has exactly nine TRUE/FALSE questions with the requested copy', () => {
    expectTrueFalseSet(solanaBasicsLesson.questions, [
      { prompt: 'You can share your wallet address', answer: true },
      { prompt: 'You can share your seed phrase', answer: false },
      { prompt: 'Connecting your wallet moves your money', answer: false },
      { prompt: 'You should read before you sign', answer: true },
      { prompt: 'Devnet SOL has real-world value', answer: false },
      { prompt: 'Mainnet uses real SOL', answer: true },
      { prompt: 'RPC helps apps talk to Solana', answer: true },
      { prompt: 'Seeker includes Seed Vault Wallet', answer: true },
      { prompt: 'You need a Seeker phone to build for Seeker', answer: false },
    ]);
  });

  it('IslandDAO has exactly seven TRUE/FALSE questions with the requested copy', () => {
    expectTrueFalseSet(islanddaoChallengeLesson.questions, [
      { prompt: 'IslandDAO is part of the Solana ecosystem', answer: true },
      { prompt: 'IslandDAO is only a wallet app', answer: false },
      { prompt: 'IslandDAO brings Web3 builders together', answer: true },
      { prompt: 'IslandDAO events are only online', answer: false },
      { prompt: 'IslandDAO uses on-chain governance', answer: true },
      { prompt: 'IslandDAO NFTs can unlock event access', answer: true },
      { prompt: 'IslandDAO is just a trading game', answer: false },
    ]);
  });

  it('DoubleZero has exactly six TRUE/FALSE questions with the requested copy', () => {
    expectTrueFalseSet(doublezeroLesson.questions, [
      { prompt: 'DoubleZero is network infrastructure', answer: true },
      { prompt: 'DoubleZero is a wallet app', answer: false },
      { prompt: 'DoubleZero helps reduce latency', answer: true },
      { prompt: 'DoubleZero builds faster network paths', answer: true },
      { prompt: 'DoubleZero is only built for games', answer: false },
      { prompt: 'DoubleZero is only for Solana', answer: false },
    ]);
  });

  it('Play Solana has exactly seven TRUE/FALSE questions with the requested copy', () => {
    expectTrueFalseSet(playSolanaLesson.questions, [
      { prompt: 'Play Solana has a handheld gaming device', answer: true },
      { prompt: 'Play Solana is built for Solana gaming', answer: true },
      { prompt: 'Play Solana is a browser extension', answer: false },
      { prompt: 'Play Solana includes wallet support', answer: true },
      { prompt: 'Play Solana connects gaming with ownership', answer: true },
      { prompt: 'Play Solana is only for desktop gaming', answer: false },
      { prompt: 'Play Solana is only a wallet app', answer: false },
    ]);
  });

  it('MonkeDAO has exactly seven TRUE/FALSE questions with the requested copy', () => {
    expectTrueFalseSet(monkedaoLesson.questions, [
      { prompt: 'MonkeDAO is a Solana NFT DAO', answer: true },
      { prompt: 'MonkeDAO is only a wallet app', answer: false },
      { prompt: 'MonkeDAO is built around a NFT community', answer: true },
      { prompt: 'MonkeDAO is a racing game', answer: false },
      { prompt: 'MonkeDAO is connected to Solana Monkey Business', answer: true },
      { prompt: 'Solana Monkey Business Monkes are pixel-art NFTs', answer: true },
      { prompt: 'MonkeDAO is only about trading NFTs', answer: false },
    ]);
  });

  it('Ride Markets has exactly seven TRUE/FALSE questions with the requested copy', () => {
    expectTrueFalseSet(rideMarketLesson.questions, [
      { prompt: 'Ride Markets is built around trade calls', answer: true },
      { prompt: 'Players choose YES or NO on a trade call', answer: true },
      { prompt: 'Ride Markets is only a wallet app', answer: false },
      { prompt: 'Each call happens inside a fund', answer: true },
      { prompt: "Winners split the losing side's pool", answer: true },
      { prompt: 'Ride calls can end in a tie', answer: false },
      { prompt: 'Ride Markets uses random luck to pick winners', answer: false },
    ]);
  });

  it('Star Atlas remains unchanged with six questions including the CEO A/B item', () => {
    expect(starAtlasLesson.questions).toHaveLength(6);

    const ceoQuestion = starAtlasLesson.questions.find(
      (question) => question.prompt === 'Who is the CEO of Star Atlas?',
    );
    expect(ceoQuestion).toBeDefined();
    expect(ceoQuestion!.left.label).toBe('Michael Wagner');
    expect(ceoQuestion!.right.label).toBe('Anonymous guy');
    expect(ceoQuestion!.correctSide).toBe('left');
  });
});
