import type { LessonPack } from '@/storage/types';
import { basePack, trueFalse } from './quizPackHelpers';

export const RIDE_MARKET_ID = 'ride-market';

export const rideMarketLesson: LessonPack = {
  ...basePack(
    RIDE_MARKET_ID,
    'Ride Markets',
    'TRUE/FALSE quiz about Ride Markets conviction trading.',
    'solo',
    7,
  ),
  questions: [
    trueFalse('ride_market_q01', 'Ride Markets is built around trade calls', true, ['ride-market']),
    trueFalse(
      'ride_market_q02',
      'Players choose YES or NO on a trade call',
      true,
      ['ride-market'],
    ),
    trueFalse('ride_market_q03', 'Ride Markets is only a wallet app', false, ['ride-market']),
    trueFalse('ride_market_q04', 'Each call happens inside a fund', true, ['ride-market']),
    trueFalse(
      'ride_market_q05',
      "Winners split the losing side's pool",
      true,
      ['ride-market'],
    ),
    trueFalse('ride_market_q06', 'Ride calls can end in a tie', false, ['ride-market']),
    trueFalse(
      'ride_market_q07',
      'Ride Markets uses random luck to pick winners',
      false,
      ['ride-market'],
    ),
  ],
};
