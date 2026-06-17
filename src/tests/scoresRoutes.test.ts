import { describe, expect, it } from 'vitest';
import {
  buildScoresLeaderboardLink,
  buildScoresPath,
  parseScoresTab,
  scoresPathDefaults,
} from '@/leaderboard/scoresRoutes';

describe('scoresRoutes', () => {
  it('defaults to islanddao-challenge and leaderboard tab', () => {
    expect(scoresPathDefaults()).toEqual({
      packId: 'islanddao-challenge',
      tab: 'leaderboard',
    });
    expect(buildScoresPath()).toBe('/scores');
    expect(parseScoresTab(null)).toBe('leaderboard');
  });

  it('builds pack and tab query params', () => {
    expect(
      buildScoresPath({ packId: 'islanddao-challenge', tab: 'leaderboard' }),
    ).toBe('/scores?pack=islanddao-challenge');

    expect(
      buildScoresPath({ packId: 'islanddao-challenge', tab: 'my-scores' }),
    ).toBe('/scores?pack=islanddao-challenge&tab=my-scores');
  });

  it('parses my-scores tab', () => {
    expect(parseScoresTab('my-scores')).toBe('my-scores');
    expect(parseScoresTab('leaderboard')).toBe('leaderboard');
    expect(parseScoresTab('unknown')).toBe('leaderboard');
  });

  it('builds contextual leaderboard link for ResultPage', () => {
    expect(buildScoresLeaderboardLink('islanddao-challenge')).toBe(
      '/scores?pack=islanddao-challenge&tab=leaderboard',
    );
  });
});
