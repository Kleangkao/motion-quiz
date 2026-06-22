import type { LessonPack } from '@/storage/types';
import { basePack, trueFalse } from './quizPackHelpers';

export const solanaBasicsLesson: LessonPack = {
  ...basePack(
    'solana-basics',
    'Solana',
    'Wallet safety, Devnet, Mainnet, and Seeker basics.',
    'solo',
    9,
  ),
  questions: [
    trueFalse(
      'solana_basics_q01',
      'You can share your wallet address',
      true,
      ['solana', 'basics', 'wallet'],
    ),
    trueFalse(
      'solana_basics_q02',
      'You can share your seed phrase',
      false,
      ['solana', 'basics', 'safety', 'wallet'],
    ),
    trueFalse(
      'solana_basics_q03',
      'Connecting your wallet moves your money',
      false,
      ['solana', 'basics', 'wallet', 'safety'],
    ),
    trueFalse(
      'solana_basics_q04',
      'You should read before you sign',
      true,
      ['solana', 'basics', 'safety', 'wallet'],
    ),
    trueFalse(
      'solana_basics_q05',
      'Devnet SOL has real-world value',
      false,
      ['solana', 'basics', 'devnet'],
    ),
    trueFalse(
      'solana_basics_q06',
      'Mainnet uses real SOL',
      true,
      ['solana', 'basics', 'mainnet'],
    ),
    trueFalse(
      'solana_basics_q07',
      'RPC helps apps talk to Solana',
      true,
      ['solana', 'basics', 'rpc'],
    ),
    trueFalse(
      'solana_basics_q08',
      'Seeker includes Seed Vault Wallet',
      true,
      ['solana', 'basics', 'seeker', 'wallet'],
    ),
    trueFalse(
      'solana_basics_q09',
      'You need a Seeker phone to build for Seeker',
      false,
      ['solana', 'basics', 'seeker', 'developer'],
    ),
  ],
};

export function solanaBasicsQuestionPrompts(lesson: Pick<LessonPack, 'questions'>): string[] {
  return lesson.questions.map((q) => q.prompt);
}

export function solanaBasicsBuiltinContentMatches(
  a: Pick<LessonPack, 'questions'>,
  b: Pick<LessonPack, 'questions'>,
): boolean {
  const ap = solanaBasicsQuestionPrompts(a);
  const bp = solanaBasicsQuestionPrompts(b);
  return ap.length === bp.length && ap.every((prompt, i) => prompt === bp[i]);
}

export function solanaBasicsBuiltinMatches(existing: LessonPack, canonical: LessonPack): boolean {
  return (
    solanaBasicsBuiltinContentMatches(existing, canonical) &&
    existing.title === canonical.title &&
    existing.description === canonical.description
  );
}
