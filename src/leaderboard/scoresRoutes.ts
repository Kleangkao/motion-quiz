import { DEFAULT_LEADERBOARD_PACK_ID } from '@/leaderboard/leaderboardTopics';

export type ScoresTab = 'leaderboard' | 'my-scores';

export const DEFAULT_SCORES_TAB: ScoresTab = 'leaderboard';

export function parseScoresTab(value: string | null | undefined): ScoresTab {
  if (value === 'my-scores') return 'my-scores';
  return DEFAULT_SCORES_TAB;
}

export function buildScoresPath(options?: {
  packId?: string;
  tab?: ScoresTab;
}): string {
  const params = new URLSearchParams();
  if (options?.packId) {
    params.set('pack', options.packId);
  }
  if (options?.tab && options.tab !== DEFAULT_SCORES_TAB) {
    params.set('tab', options.tab);
  }
  const query = params.toString();
  return query ? `/scores?${query}` : '/scores';
}

export function buildScoresLeaderboardLink(packId: string): string {
  const params = new URLSearchParams({
    pack: packId,
    tab: 'leaderboard',
  });
  return `/scores?${params.toString()}`;
}

export function scoresPathDefaults(): { packId: string; tab: ScoresTab } {
  return {
    packId: DEFAULT_LEADERBOARD_PACK_ID,
    tab: DEFAULT_SCORES_TAB,
  };
}
