import type { LessonPack } from '@/storage/types';
import { basePack, trueFalse } from './quizPackHelpers';

export const PLAY_SOLANA_ID = 'play-solana';

export const playSolanaLesson: LessonPack = {
  ...basePack(
    PLAY_SOLANA_ID,
    'Play Solana',
    'TRUE/FALSE quiz about Play Solana and the PSG1 handheld.',
    'solo',
    6,
  ),
  questions: [
    trueFalse('play_solana_q01', 'PSG1 is a handheld gaming device', true, ['play-solana']),
    trueFalse('play_solana_q02', 'PSG1 is built for Solana gaming', true, ['play-solana']),
    trueFalse('play_solana_q03', 'PSG1 is a browser extension', false, ['play-solana']),
    trueFalse('play_solana_q04', 'PSG1 includes wallet support', true, ['play-solana']),
    trueFalse('play_solana_q05', 'Play Solana is only for desktop gaming', false, ['play-solana']),
    trueFalse('play_solana_q06', 'PSG1 is designed for Web3 games', true, ['play-solana']),
  ],
};
