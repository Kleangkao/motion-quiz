import type { LessonPack } from '@/storage/types';
import { basePack, trueFalse } from './quizPackHelpers';

export const ISLANDDAO_CHALLENGE_ID = 'islanddao-challenge';

export const islanddaoChallengeLesson: LessonPack = {
  ...basePack(
    ISLANDDAO_CHALLENGE_ID,
    'IslandDAO Challenge',
    'IslandDAO, builders, events, and community quests.',
    'challenge',
    7,
    ISLANDDAO_CHALLENGE_ID,
  ),
  questions: [
    trueFalse(
      'islanddao_q01',
      'IslandDAO is part of the Solana ecosystem',
      true,
      ['islanddao'],
    ),
    trueFalse('islanddao_q02', 'IslandDAO is only a wallet app', false, ['islanddao']),
    trueFalse(
      'islanddao_q03',
      'IslandDAO brings Web3 builders together',
      true,
      ['islanddao'],
    ),
    trueFalse('islanddao_q04', 'IslandDAO events are only online', false, ['islanddao']),
    trueFalse('islanddao_q05', 'IslandDAO uses on-chain governance', true, ['islanddao']),
    trueFalse(
      'islanddao_q06',
      'IslandDAO NFTs can unlock event access',
      true,
      ['islanddao'],
    ),
    trueFalse('islanddao_q07', 'IslandDAO is just a trading game', false, ['islanddao']),
  ],
};

/** Compare built-in IslandDAO question prompts for idempotent IndexedDB sync. */
export function islandDaoQuestionPrompts(lesson: Pick<LessonPack, 'questions'>): string[] {
  return lesson.questions.map((q) => q.prompt);
}

/** Choice image paths (left then right per question) for built-in sync fingerprinting. */
export function islandDaoChoiceImagePaths(lesson: Pick<LessonPack, 'questions'>): string[] {
  return lesson.questions.flatMap((q) => [q.left.image?.value ?? '', q.right.image?.value ?? '']);
}

export function islandDaoBuiltinContentMatches(
  a: Pick<LessonPack, 'questions'>,
  b: Pick<LessonPack, 'questions'>,
): boolean {
  const promptsMatch =
    islandDaoQuestionPrompts(a).length === islandDaoQuestionPrompts(b).length &&
    islandDaoQuestionPrompts(a).every((prompt, i) => prompt === islandDaoQuestionPrompts(b)[i]);
  if (!promptsMatch) return false;
  const aPaths = islandDaoChoiceImagePaths(a);
  const bPaths = islandDaoChoiceImagePaths(b);
  return aPaths.length === bPaths.length && aPaths.every((path, i) => path === bPaths[i]);
}
