import type { LessonPack } from '@/storage/types';
import { alternateSides, basePack, twoChoice } from './quizPackHelpers';

const sides = alternateSides(10);

export const islanddaoChallengeLesson: LessonPack = {
  ...basePack(
    'islanddao-challenge',
    'IslandDAO Challenge',
    'A Solana community residency quiz covering IslandDAO V4 in Koh Samui and the next IslandDAO Brazil stop.',
    'challenge',
    10,
    'islanddao-challenge',
  ),
  questions: [
    twoChoice(
      'islanddao_q01',
      'IslandDAO V4 is best described as what?',
      'A month-long coliving and coworking residency',
      'A one-hour livestream',
      sides[0],
      ['islanddao', 'community', 'residency'],
    ),
    twoChoice(
      'islanddao_q02',
      'IslandDAO V4 takes place at which location?',
      'Villa Solana, Koh Samui, Thailand',
      'Bangkok Convention Center',
      sides[1],
      ['islanddao', 'thailand', 'v4'],
    ),
    twoChoice(
      'islanddao_q03',
      'IslandDAO V4 runs during which period?',
      'Jun 3–28, 2026',
      'Oct-Nov 2026',
      sides[2],
      ['islanddao', 'v4', 'dates'],
    ),
    twoChoice(
      'islanddao_q04',
      'What kind of people does IslandDAO V4 bring together?',
      'Developers, founders, and creators from the Solana ecosystem',
      'Only passive spectators',
      sides[3],
      ['islanddao', 'community'],
    ),
    twoChoice(
      'islanddao_q05',
      'What is one thing the IslandDAO V4 residency unlocks?',
      'Co-working space and daily workshops',
      'Guaranteed token profits',
      sides[4],
      ['islanddao', 'v4', 'workshops'],
    ),
    twoChoice(
      'islanddao_q06',
      'Which activity is listed as part of the IslandDAO V4 experience?',
      'Hackathon',
      'Seed phrase sharing',
      sides[5],
      ['islanddao', 'v4', 'hackathon'],
    ),
    twoChoice(
      'islanddao_q07',
      'What makes IslandDAO different from a normal one-day conference?',
      'People live and work together over multiple weeks',
      'It is only a single keynote session',
      sides[6],
      ['islanddao', 'residency'],
    ),
    twoChoice(
      'islanddao_q08',
      'IslandDAO Brazil / V5 is planned for which city?',
      'Florianópolis, Brazil',
      'São Paulo, Brazil',
      sides[7],
      ['islanddao', 'brazil', 'v5'],
    ),
    twoChoice(
      'islanddao_q09',
      'IslandDAO Brazil / V5 is planned for which period?',
      'Oct-Nov 2026',
      'Jun 3–28, 2026',
      sides[8],
      ['islanddao', 'brazil', 'v5', 'dates'],
    ),
    twoChoice(
      'islanddao_q10',
      'In Seeker Motion Quiz, what should IslandDAO questions avoid claiming?',
      'Guaranteed rewards or profits',
      'Event location',
      sides[9],
      ['islanddao', 'safety', 'copy'],
    ),
  ],
};
