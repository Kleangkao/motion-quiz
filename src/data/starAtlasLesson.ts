import type { LessonPack } from '@/storage/types';
import { basePack, trueFalse } from './quizPackHelpers';

export const STAR_ATLAS_ID = 'star-atlas';

export const starAtlasLesson: LessonPack = {
  ...basePack(
    STAR_ATLAS_ID,
    'Star Atlas',
    'TRUE/FALSE quiz about the Star Atlas space MMO on Solana.',
    'solo',
    8,
  ),
  questions: [
    trueFalse('star_atlas_q01', 'Star Atlas is built on Solana', true, ['star-atlas']),
    trueFalse('star_atlas_q02', 'Star Atlas is a space MMO', true, ['star-atlas']),
    trueFalse('star_atlas_q03', 'Star Atlas is only a wallet app', false, ['star-atlas']),
    trueFalse('star_atlas_q04', 'Star Atlas includes space exploration', true, ['star-atlas']),
    trueFalse('star_atlas_q05', 'ATLAS is used in Star Atlas gameplay', true, ['star-atlas']),
    trueFalse('star_atlas_q06', 'POLIS is used for governance', true, ['star-atlas']),
    trueFalse('star_atlas_q07', 'Star Atlas ships can be NFTs', true, ['star-atlas']),
    trueFalse('star_atlas_q08', 'Star Atlas is only about trading tokens', false, ['star-atlas']),
  ],
};
