import type { LessonPack } from '@/storage/types';
import { basePack, trueFalse } from './quizPackHelpers';

export const DOUBLEZERO_ID = 'doublezero';

export const doublezeroLesson: LessonPack = {
  ...basePack(
    DOUBLEZERO_ID,
    'DoubleZero',
    'TRUE/FALSE quiz about DoubleZero network infrastructure.',
    'solo',
    6,
  ),
  questions: [
    trueFalse('doublezero_q01', 'DoubleZero is network infrastructure', true, ['doublezero']),
    trueFalse('doublezero_q02', 'DoubleZero is a wallet app', false, ['doublezero']),
    trueFalse('doublezero_q03', 'DoubleZero helps reduce latency', true, ['doublezero']),
    trueFalse('doublezero_q04', 'DoubleZero builds faster network paths', true, ['doublezero']),
    trueFalse('doublezero_q05', 'DoubleZero is only built for games', false, ['doublezero']),
    trueFalse('doublezero_q06', 'DoubleZero is only for Solana', false, ['doublezero']),
  ],
};
