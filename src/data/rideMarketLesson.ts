import type { LessonPack } from '@/storage/types';
import { basePack, trueFalse } from './quizPackHelpers';

export const RIDE_MARKET_ID = 'ride-market';

export const rideMarketLesson: LessonPack = {
  ...basePack(
    RIDE_MARKET_ID,
    'Ride Markets',
    'TRUE/FALSE quiz about Ride Markets conviction trading.',
    'solo',
    9,
  ),
  questions: [
    trueFalse('ride_market_q01', 'Ride Markets is a conviction market', true, ['ride-market']),
    trueFalse(
      'ride_market_q02',
      'Players pick YES or NO on a trade call',
      true,
      ['ride-market'],
    ),
    trueFalse('ride_market_q03', 'Ride Markets is only a wallet app', false, ['ride-market']),
    trueFalse('ride_market_q04', 'Each call belongs to a fund', true, ['ride-market']),
    trueFalse(
      'ride_market_q05',
      "Winners split the losing side's pool",
      true,
      ['ride-market'],
    ),
    trueFalse('ride_market_q06', 'Joining earlier can matter', true, ['ride-market']),
    trueFalse('ride_market_q07', 'Calls can end in a tie', false, ['ride-market']),
    trueFalse('ride_market_q08', 'A caller posts a bond to make a call', true, ['ride-market']),
    trueFalse('ride_market_q09', 'Ride calls are just predictions', false, ['ride-market']),
  ],
};
