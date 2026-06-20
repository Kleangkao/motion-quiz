import type { LessonPack } from '@/storage/types';
import { basePack, trueFalse } from './quizPackHelpers';

export const MONKEDAO_ID = 'monkedao';

export const monkedaoLesson: LessonPack = {
  ...basePack(
    MONKEDAO_ID,
    'MonkeDAO',
    'TRUE/FALSE quiz about MonkeDAO and Solana Monkey Business NFTs.',
    'solo',
    6,
  ),
  questions: [
    trueFalse('monkedao_q01', 'MonkeDAO is a Solana NFT DAO', true, ['monkedao']),
    trueFalse('monkedao_q02', 'MonkeDAO is linked to SMB NFTs', true, ['monkedao']),
    trueFalse('monkedao_q03', 'SMB Monkes are pixel-art NFTs', true, ['monkedao']),
    trueFalse('monkedao_q04', 'MonkeDAO is only a wallet app', false, ['monkedao']),
    trueFalse(
      'monkedao_q05',
      'SMB holders can access the MonkeDAO community',
      true,
      ['monkedao'],
    ),
    trueFalse('monkedao_q06', 'MonkeDAO is a racing game', false, ['monkedao']),
  ],
};
