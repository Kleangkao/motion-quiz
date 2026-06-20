import type { LessonPack } from '@/storage/types';
import { basePack, trueFalse } from './quizPackHelpers';

export const PLAY_SOLANA_ID = 'play-solana';

export const playSolanaLesson: LessonPack = {
  ...basePack(
    PLAY_SOLANA_ID,
    'Play Solana',
    'Solana gaming, handheld play, and wallet support.',
    'solo',
    7,
  ),
  questions: [
    trueFalse('play_solana_q01', 'Play Solana has a handheld gaming device', true, ['play-solana']),
    trueFalse('play_solana_q02', 'Play Solana is built for Solana gaming', true, ['play-solana']),
    trueFalse('play_solana_q03', 'Play Solana is a browser extension', false, ['play-solana']),
    trueFalse('play_solana_q04', 'Play Solana includes wallet support', true, ['play-solana']),
    trueFalse(
      'play_solana_q05',
      'Play Solana connects gaming with ownership',
      true,
      ['play-solana'],
    ),
    trueFalse('play_solana_q06', 'Play Solana is only for desktop gaming', false, ['play-solana']),
    trueFalse('play_solana_q07', 'Play Solana is only a wallet app', false, ['play-solana']),
  ],
};
