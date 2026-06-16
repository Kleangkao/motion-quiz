import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { getResultSession } from '@/storage/resultStorage';
import type { ResultSession } from '@/storage/types';
import { PageLayout } from '@/components/layout/PageLayout';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import { ScoreProofPanel } from '@/components/result/ScoreProofPanel';
import { GameMomentPanel } from '@/components/result/GameMomentPanel';
import { SessionPhotoGallery } from '@/components/result/SessionPhotoGallery';
import { getSessionPhotos } from '@/game/sessionPhotoCache';

export function ResultPage() {
  const { lessonId, sessionId } = useParams<{ lessonId: string; sessionId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [session, setSession] = useState<ResultSession | null>(null);
  const [loading, setLoading] = useState(true);

  const sessionPhotos = useMemo(() => {
    const fromNav = (location.state as { sessionPhotos?: string[] } | null)?.sessionPhotos;
    if (fromNav?.length) return fromNav;
    if (sessionId) return getSessionPhotos(sessionId) ?? [];
    return [];
  }, [location.state, sessionId]);

  useEffect(() => {
    if (sessionId) {
      getResultSession(sessionId).then((s) => {
        setSession(s ?? null);
        setLoading(false);
      });
    }
  }, [sessionId]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner /></div>;
  if (!session) return (
    <div className="min-h-screen flex items-center justify-center">
      <ErrorMessage title="Result not found" message="This session could not be found." onRetry={() => navigate('/play')} />
    </div>
  );

  const medalEmoji = session.accuracy >= 80 ? '🥇' : session.accuracy >= 60 ? '🥈' : '🥉';
  const modeLabel = session.playMode === 'challenge' ? 'Challenge' : 'Solo';

  return (
    <PageLayout title="Result" backTo="/results">
      <div className="space-y-6">
        <div className="glass-card p-8 text-center space-y-2">
          <div className="text-6xl">{medalEmoji}</div>
          <h2 className="text-3xl font-black text-white">{session.score} points</h2>
          <p className="text-white/60">{session.challengeName ?? session.lessonTitle}</p>
          <p className="text-xs text-white/30">
            {modeLabel} · {new Date(session.startedAt).toLocaleString()}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Correct', value: session.correctCount, color: 'text-green-400' },
            { label: 'Wrong', value: session.wrongCount, color: 'text-red-400' },
            { label: 'Skipped', value: session.skippedCount, color: 'text-yellow-400' },
            { label: 'Accuracy', value: `${session.accuracy.toFixed(0)}%`, color: 'text-indigo-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="glass-card p-4 text-center">
              <div className={`text-2xl font-black ${color}`}>{value}</div>
              <div className="text-xs text-white/50 mt-1">{label}</div>
            </div>
          ))}
        </div>

        <ScoreProofPanel session={session} onUpdated={setSession} />

        {sessionPhotos.length > 0 && (
          <SessionPhotoGallery photos={sessionPhotos} sessionId={session.id} />
        )}

        <GameMomentPanel session={session} sessionPhotos={sessionPhotos} />

        <div className="glass-card p-5">
          <h3 className="font-bold text-white mb-4">Question Breakdown</h3>
          <div className="space-y-2">
            {session.questionResults.map((qr, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl bg-white/5 px-4 py-2">
                <span className="text-lg">{qr.isCorrect ? '✅' : '❌'}</span>
                <span className="flex-1 text-sm text-white">{qr.prompt}</span>
                <span className="text-xs text-white/40 capitalize">{qr.inputMethod}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={() => navigate(`/play/${lessonId}/gesture-test`)} className="btn btn-primary btn-lg flex-1">
            Play Again
          </button>
          <button onClick={() => navigate('/play')} className="btn btn-secondary btn-lg flex-1">
            All Packs
          </button>
        </div>
      </div>
    </PageLayout>
  );
}
