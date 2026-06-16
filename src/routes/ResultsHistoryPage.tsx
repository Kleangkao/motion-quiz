import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listResultSessions, clearResults, deleteResultSession } from '@/storage/resultStorage';
import type { ResultSession } from '@/storage/types';
import { PageLayout } from '@/components/layout/PageLayout';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { resultsToCsv, downloadCsv } from '@/utils/csv';
import { downloadJson } from '@/utils/json';
import { shortenAddress } from '@/solana/WalletProvider';

export function ResultsHistoryPage() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<ResultSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const load = async () => {
    const all = await listResultSessions();
    setSessions(all);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleExportCsv = () => {
    downloadCsv(resultsToCsv(sessions), 'seeker-motion-quiz-results.csv');
  };

  const handleExportJson = () => {
    downloadJson({ exportedAt: new Date().toISOString(), results: sessions }, 'seeker-motion-quiz-results.json');
  };

  const handleClear = async () => {
    await clearResults();
    setShowClearConfirm(false);
    load();
  };

  const handleDelete = async (id: string) => {
    await deleteResultSession(id);
    load();
  };

  return (
    <PageLayout
      title="Results"
      backTo="/"
      actions={
        sessions.length > 0 ? (
          <div className="flex gap-2">
            <button onClick={handleExportJson} className="btn btn-secondary btn-sm text-xs">↓ JSON</button>
            <button onClick={handleExportCsv} className="btn btn-secondary btn-sm text-xs">↓ CSV</button>
            <button onClick={() => setShowClearConfirm(true)} className="btn btn-danger btn-sm text-xs">Clear</button>
          </div>
        ) : undefined
      }
    >
      {loading ? (
        <LoadingSpinner />
      ) : sessions.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <p className="text-4xl">📊</p>
          <p className="text-white/60">No results yet. Play Solo or a Challenge to see scores here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((s) => (
            <button
              key={s.id}
              onClick={() => navigate(`/play/${s.lessonId}/result/${s.id}`)}
              className="glass-card p-4 w-full text-left flex items-center gap-3 hover:bg-white/15 transition"
            >
              <div className="flex-1 min-w-0">
                <p className="font-bold text-white truncate">{s.challengeName ?? s.lessonTitle}</p>
                <p className="text-xs text-white/40">
                  {new Date(s.startedAt).toLocaleString()} · {s.score} pts · {s.accuracy.toFixed(0)}%
                  {s.playMode ? ` · ${s.playMode}` : ''}
                </p>
                <div className="mt-1 flex flex-wrap gap-2 text-xs">
                  <span className="text-green-400">✓ {s.correctCount}</span>
                  <span className="text-red-400">✗ {s.wrongCount}</span>
                  {s.scoreProof && (
                    <span className="text-indigo-300">🔏 Signed · {shortenAddress(s.scoreProof.walletAddress, 4)}</span>
                  )}
                </div>
              </div>
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => { e.stopPropagation(); handleDelete(s.id); }}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); handleDelete(s.id); } }}
                className="btn btn-danger btn-sm text-xs flex-shrink-0"
              >
                🗑
              </span>
            </button>
          ))}
        </div>
      )}

      {showClearConfirm && (
        <ConfirmDialog
          title="Clear All Results"
          message="This will permanently delete all local result history. This cannot be undone."
          confirmLabel="Clear All"
          danger
          onConfirm={handleClear}
          onCancel={() => setShowClearConfirm(false)}
        />
      )}
    </PageLayout>
  );
}
