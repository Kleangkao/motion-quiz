import type { LessonPack } from '@/storage/types';
import { alternateSides, basePack, twoChoice } from './quizPackHelpers';

export const ISLANDDAO_CHALLENGE_ID = 'islanddao-challenge';

const sides = alternateSides(5);

export const islanddaoChallengeLesson: LessonPack = {
  ...basePack(
    ISLANDDAO_CHALLENGE_ID,
    'IslandDAO Challenge',
    'Five quick questions on IslandDAO, IslandHack, and the V4 and V5 community stops.',
    'challenge',
    5,
    ISLANDDAO_CHALLENGE_ID,
  ),
  questions: [
    twoChoice(
      'islanddao_q01',
      'What is IslandDAO?',
      'A Network State of Web3 power users where community comes first',
      'A short-term crypto trading group',
      sides[0],
      ['islanddao', 'community'],
    ),
    twoChoice(
      'islanddao_q02',
      'IslandDAO V4 takes place at which location?',
      'Villa Solana, Koh Samui, Thailand',
      'A conference hall in Singapore',
      sides[1],
      ['islanddao', 'thailand', 'v4'],
    ),
    twoChoice(
      'islanddao_q03',
      'What is the IslandHack prize pool?',
      '$10,000 USDC',
      '$100 in guaranteed rewards',
      sides[2],
      ['islanddao', 'islandhack'],
    ),
    twoChoice(
      'islanddao_q04',
      'Where and when is IslandDAO V5 planned?',
      'Florianópolis, Brazil, Oct-Nov 2026',
      'Dubai, UAE, Dec 2026',
      sides[3],
      ['islanddao', 'brazil', 'v5'],
    ),
    twoChoice(
      'islanddao_q05',
      'What does an IslandDAO NFT unlock?',
      'Community access, events, governance, and member perks',
      'Automatic profit sharing from every event',
      sides[4],
      ['islanddao', 'nft'],
    ),
  ],
};

/** Compare built-in IslandDAO question prompts for idempotent IndexedDB sync. */
export function islandDaoQuestionPrompts(lesson: Pick<LessonPack, 'questions'>): string[] {
  return lesson.questions.map((q) => q.prompt);
}
