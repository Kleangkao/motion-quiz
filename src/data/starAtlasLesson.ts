import type { LessonPack } from '@/storage/types';
import { basePack, trueFalse, twoChoice } from './quizPackHelpers';

export const STAR_ATLAS_ID = 'star-atlas';

export const starAtlasLesson: LessonPack = {
  ...basePack(
    STAR_ATLAS_ID,
    'Star Atlas',
    'Quiz about the Star Atlas space MMO on Solana.',
    'solo',
    6,
  ),
  questions: [
    trueFalse('star_atlas_q01', 'Star Atlas is built on Solana', true, ['star-atlas']),
    trueFalse('star_atlas_q02', 'Star Atlas is a space MMO', true, ['star-atlas']),
    trueFalse('star_atlas_q03', 'ATLAS is used in Star Atlas gameplay', true, ['star-atlas']),
    trueFalse('star_atlas_q04', 'POLIS is used for governance', true, ['star-atlas']),
    twoChoice(
      'star_atlas_q05',
      'Who is the CEO of Star Atlas?',
      'Michael Wagner',
      'Anonymous guy',
      'left',
      ['star-atlas'],
    ),
    trueFalse(
      'star_atlas_q06',
      'Star Atlas is set about 600 years in the future',
      true,
      ['star-atlas'],
    ),
  ],
};
