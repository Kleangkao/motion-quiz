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
    trueFalse(
      'doublezero_q03',
      'DoubleZero helps distributed systems communicate',
      true,
      ['doublezero'],
    ),
    trueFalse('doublezero_q04', 'DoubleZero is only for gaming', false, ['doublezero']),
    trueFalse('doublezero_q05', 'DoubleZero aims to reduce latency', true, ['doublezero']),
    trueFalse(
      'doublezero_q06',
      'DoubleZero uses high-performance network links',
      true,
      ['doublezero'],
    ),
  ],
};
