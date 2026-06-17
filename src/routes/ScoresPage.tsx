import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PageLayout } from '@/components/layout/PageLayout';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useWallet } from '@/solana/WalletProvider';
import { getSolanaCluster, isSupabaseConfigured } from '@/solana/env';
import {
  fetchMyRecordedScores,
  fetchTopicLeaderboard,
  leaderboardErrorMessage,
} from '@/leaderboard/leaderboardClient';
import {
  explorerUrlForTx,
  formatAccuracyPercent,
  formatDurationMs,
  formatRecordedTime,
  formatScoreLine,
  formatWalletDisplay,
  pickRecordedDisplayTime,
} from '@/leaderboard/leaderboardFormat';
import {
  loadLeaderboardTopicOptions,
  resolveLeaderboardPackId,
} from '@/leaderboard/leaderboardTopics';
import { parseScoresTab, type ScoresTab } from '@/leaderboard/scoresRoutes';
import type { LeaderboardTopicOption, RecordedScoreRow, TopicLeaderboardRow } from '@/leaderboard/types';

function LeaderboardRowCard({ row }: { row: TopicLeaderboardRow }) {
  const cluster = row.cluster;

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 flex items-center gap-3">
      <div className="w-8 text-center text-sm font-black text-indigo-300">#{row.rank}</div>
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-white font-mono">
            {formatWalletDisplay(row.walletShort || row.walletAddress, 4)}
          </span>
          <span className="text-xs text-white/45">
            {formatScoreLine(row.score, row.total)} · {formatAccuracyPercent(row.accuracy)}
          </span>
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-white/40">
          {formatDurationMs(row.durationMs) && (
            <span>Time {formatDurationMs(row.durationMs)}</span>
          )}
          <span>{formatRecordedTime(row.blockTime ?? row.createdAt)}</span>
        </div>
      </div>
      <a
        href={explorerUrlForTx(row.txSignature, cluster)}
        target="_blank"
        rel="noopener noreferrer"
        className="btn btn-secondary btn-sm text-[10px] flex-shrink-0"
      >
        Tx
      </a>
    </div>
  );
}

function MyScoreCard({ row }: { row: RecordedScoreRow }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white truncate">{row.packTitle}</p>
          <p className="text-xs text-white/45 mt-1">
            {formatScoreLine(row.score, row.total)} · {formatAccuracyPercent(row.accuracy)}
          </p>
        </div>
        <a
          href={explorerUrlForTx(row.txSignature, row.cluster)}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-secondary btn-sm text-[10px] flex-shrink-0"
        >
          Tx
        </a>
      </div>
      <p className="text-[11px] text-white/35">{pickRecordedDisplayTime(row)}</p>
    </div>
  );
}

export function ScoresPage() {
  const cluster = getSolanaCluster();
  const configured = isSupabaseConfigured();
  const { address, connecting, requestConnect } = useWallet();
  const [searchParams, setSearchParams] = useSearchParams();

  const [topicOptions, setTopicOptions] = useState<LeaderboardTopicOption[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(true);
  const [leaderboardRows, setLeaderboardRows] = useState<TopicLeaderboardRow[]>([]);
  const [myScores, setMyScores] = useState<RecordedScoreRow[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [hasFetchedLeaderboard, setHasFetchedLeaderboard] = useState(false);
  const [myScoresLoading, setMyScoresLoading] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);
  const [myScoresError, setMyScoresError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const activeTab = parseScoresTab(searchParams.get('tab'));

  const selectedPackId = useMemo(
    () => resolveLeaderboardPackId(searchParams.get('pack'), topicOptions),
    [searchParams, topicOptions],
  );

  const selectedTopic = useMemo(
    () => topicOptions.find((option) => option.packId === selectedPackId) ?? null,
    [topicOptions, selectedPackId],
  );

  const selectionReady = !topicsLoading && topicOptions.length > 0 && selectedTopic != null;

  const leaderboardPending =
    activeTab === 'leaderboard' &&
    configured &&
    selectionReady &&
    (leaderboardLoading || !hasFetchedLeaderboard);
  useEffect(() => {
    let cancelled = false;
    setTopicsLoading(true);
    loadLeaderboardTopicOptions()
      .then((options) => {
        if (!cancelled) setTopicOptions(options);
      })
      .finally(() => {
        if (!cancelled) setTopicsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const loadLeaderboard = useCallback(async () => {
    if (!configured || !selectedTopic) return;

    setLeaderboardLoading(true);
    setLeaderboardError(null);
    setHasFetchedLeaderboard(false);

    const result = await fetchTopicLeaderboard({
      packId: selectedTopic.packId,
      packContentHash: selectedTopic.packContentHash,
      cluster,
      limit: 50,
    });

    if (!result.ok) {
      setLeaderboardRows([]);
      setLeaderboardError(leaderboardErrorMessage(result.error));
    } else {
      setLeaderboardRows(result.rows);
    }

    setLeaderboardLoading(false);
    setHasFetchedLeaderboard(true);
  }, [configured, selectedTopic, cluster]);

  const loadMyScores = useCallback(async () => {
    if (!configured || !address) {
      setMyScores([]);
      setMyScoresError(null);
      return;
    }

    setMyScoresLoading(true);
    setMyScoresError(null);

    const result = await fetchMyRecordedScores({
      walletAddress: address,
      cluster,
      limit: 20,
    });

    if (!result.ok) {
      setMyScores([]);
      setMyScoresError(leaderboardErrorMessage(result.error));
    } else {
      setMyScores(result.rows);
    }

    setMyScoresLoading(false);
  }, [configured, address, cluster]);

  useEffect(() => {
    if (activeTab !== 'leaderboard' || topicsLoading || !configured || !selectedTopic) return;
    void loadLeaderboard();
  }, [loadLeaderboard, refreshKey, activeTab, topicsLoading, configured, selectedTopic]);

  useEffect(() => {
    if (activeTab !== 'my-scores') return;
    void loadMyScores();
  }, [loadMyScores, refreshKey, activeTab]);

  const updateSearchParams = (mutate: (params: URLSearchParams) => void) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      mutate(next);
      return next;
    });
  };

  const selectPack = (packId: string) => {
    updateSearchParams((params) => {
      params.set('pack', packId);
    });
  };

  const selectTab = (tab: ScoresTab) => {
    updateSearchParams((params) => {
      if (tab === 'leaderboard') {
        params.delete('tab');
      } else {
        params.set('tab', tab);
      }
    });
  };

  const handleRefresh = () => {
    setRefreshKey((value) => value + 1);
  };

  const handleConnect = () => {
    requestConnect().catch(() => {
      // surfaced via wallet context
    });
  };

  if (topicsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner label="Loading scores…" />
      </div>
    );
  }

  return (
    <PageLayout
      title="Scores"
      backTo="/"
      actions={
        configured ? (
          <button type="button" onClick={handleRefresh} className="btn btn-secondary btn-sm text-xs">
            Refresh
          </button>
        ) : undefined
      }
    >
      <div className="space-y-6">
        <div>
          <p className="text-sm text-white/50">Verified scores recorded on Solana devnet.</p>
        </div>

        <div className="flex gap-2">
          {(['leaderboard', 'my-scores'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => selectTab(tab)}
              className={`btn btn-sm flex-1 ${activeTab === tab ? 'btn-primary' : 'btn-secondary'}`}
            >
              {tab === 'leaderboard' ? 'Leaderboard' : 'My Scores'}
            </button>
          ))}
        </div>

        {!configured ? (
          <div className="glass-card p-5">
            <p className="text-sm text-white/60">Scores are not configured yet.</p>
          </div>
        ) : activeTab === 'leaderboard' ? (
          <>
            <section className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-white/40">Topic</h2>
              <div className="flex flex-wrap gap-2">
                {topicOptions.map((option) => {
                  const active = option.packId === selectedPackId;
                  return (
                    <button
                      key={option.packId}
                      type="button"
                      onClick={() => selectPack(option.packId)}
                      className={`btn btn-sm ${active ? 'btn-primary' : 'btn-secondary'}`}
                    >
                      {option.title}
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="space-y-3">
              {!selectionReady || leaderboardPending ? (
                <LoadingSpinner label="Loading leaderboard…" />
              ) : leaderboardError ? (
                <div className="glass-card p-5">
                  <p className="text-sm text-red-400">{leaderboardError}</p>
                </div>
              ) : leaderboardRows.length === 0 ? (
                <div className="glass-card p-5">
                  <p className="text-sm text-white/60">No recorded scores yet for this topic.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {leaderboardRows.map((row) => (
                    <LeaderboardRowCard key={row.id} row={row} />
                  ))}
                </div>
              )}
            </section>
          </>
        ) : (
          <section className="space-y-3">
            {!address ? (
              <div className="glass-card p-5 space-y-3">
                <p className="text-sm text-white/60">
                  Connect wallet to see your recorded scores.
                </p>
                <button
                  type="button"
                  onClick={handleConnect}
                  disabled={connecting}
                  className="btn btn-secondary btn-sm"
                >
                  {connecting ? 'Connecting…' : 'Connect Wallet'}
                </button>
              </div>
            ) : myScoresLoading ? (
              <LoadingSpinner label="Loading your scores…" />
            ) : myScoresError ? (
              <div className="glass-card p-5">
                <p className="text-sm text-red-400">{myScoresError}</p>
              </div>
            ) : myScores.length === 0 ? (
              <div className="glass-card p-5 space-y-2">
                <p className="text-sm text-white/60">No recorded scores for this wallet yet.</p>
                <p className="text-xs text-white/40">
                  Play a built-in topic and use Record Score on Solana from the result page.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {myScores.map((row) => (
                  <MyScoreCard key={row.id} row={row} />
                ))}
              </div>
            )}
          </section>
        )}

        <p className="text-xs text-white/30 text-center">
          Built-in topics only. Custom topics are not eligible.{' '}
          <Link to="/play" className="text-indigo-300/80 hover:text-indigo-200">
            Start Quiz
          </Link>
        </p>
      </div>
    </PageLayout>
  );
}

/** @deprecated Use ScoresPage — kept for backward-compatible imports */
export const LeaderboardPage = ScoresPage;
