import type { LessonPack, QuizQuestion } from '@/storage/types';
import { basePack } from './quizPackHelpers';

function safeRisky(
  id: string,
  prompt: string,
  answer: 'SAFE' | 'RISKY',
  tags?: string[],
): QuizQuestion {
  return {
    id,
    prompt,
    left: { id: `${id}_safe`, label: 'SAFE' },
    right: { id: `${id}_risky`, label: 'RISKY' },
    correctSide: answer === 'SAFE' ? 'left' : 'right',
    difficulty: 'easy',
    tags,
  };
}

function trueFalse(
  id: string,
  prompt: string,
  answer: boolean,
  tags?: string[],
): QuizQuestion {
  return {
    id,
    prompt,
    left: { id: `${id}_true`, label: 'TRUE' },
    right: { id: `${id}_false`, label: 'FALSE' },
    correctSide: answer ? 'left' : 'right',
    difficulty: 'easy',
    tags,
  };
}

export const solanaBasicsLesson: LessonPack = {
  ...basePack(
    'solana-basics',
    'Solana Basics',
    'Wallet safety and Solana fundamentals for Motion Quiz.',
    'solo',
    7,
  ),
  questions: [
    safeRisky(
      'solana_basics_q01',
      'Sharing your seed phrase',
      'RISKY',
      ['solana', 'basics', 'safety', 'wallet'],
    ),
    safeRisky(
      'solana_basics_q02',
      'Sharing your wallet address',
      'SAFE',
      ['solana', 'basics', 'wallet'],
    ),
    trueFalse(
      'solana_basics_q03',
      'Devnet SOL is real money',
      false,
      ['solana', 'basics', 'devnet'],
    ),
    trueFalse(
      'solana_basics_q04',
      'Mainnet is the real network',
      true,
      ['solana', 'basics', 'mainnet'],
    ),
    trueFalse(
      'solana_basics_q05',
      'Connecting wallet instantly sends money',
      false,
      ['solana', 'basics', 'wallet', 'safety'],
    ),
    safeRisky(
      'solana_basics_q06',
      'Reading before signing',
      'SAFE',
      ['solana', 'basics', 'safety', 'wallet'],
    ),
    trueFalse(
      'solana_basics_q07',
      'RPC helps apps talk to Solana',
      true,
      ['solana', 'basics', 'rpc'],
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
