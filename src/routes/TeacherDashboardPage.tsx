import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  listLessons,
  deleteLesson,
  duplicateLesson,
  exportLesson,
} from '@/storage/lessonStorage';
import type { LessonPack } from '@/storage/types';
import { PageLayout } from '@/components/layout/PageLayout';
import { ImportExportPanel } from '@/components/teacher/ImportExportPanel';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

export function TeacherDashboardPage() {
  const navigate = useNavigate();
  const [lessons, setLessons] = useState<LessonPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<LessonPack | null>(null);

  const load = useCallback(async () => {
    const all = await listLessons();
    setLessons(all);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteLesson(deleteTarget.id);
    setDeleteTarget(null);
    load();
  };

  const handleDuplicate = async (id: string) => {
    await duplicateLesson(id);
    load();
  };

  const handleExport = async (id: string) => {
    await exportLesson(id);
  };

  return (
    <PageLayout
      title="Create Pack"
      backTo="/"
      actions={
        <button onClick={() => navigate('/challenge/host/lesson/new')} className="btn btn-primary btn-sm">
          + New Challenge Pack
        </button>
      }
    >
      <div className="space-y-6">
        <ImportExportPanel onImported={load} />

        {loading ? (
          <LoadingSpinner />
        ) : lessons.length === 0 ? (
          <div className="text-center py-12 space-y-4">
            <p className="text-4xl">📭</p>
            <p className="text-white/60">No quiz packs yet. Create a challenge pack to export and share.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {lessons.map((lesson) => (
              <div key={lesson.id} className="glass-card p-4">
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-white truncate">{lesson.title}</h3>
                    <p className="text-xs text-white/40 mt-0.5">
                      {lesson.questions.length} questions · {Math.floor(lesson.durationSeconds / 60)}m {lesson.durationSeconds % 60}s
                    </p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() =>
                        navigate(`/play/${lesson.id}/calibrate`, {
                          state: {
                            playMode: lesson.packKind === 'challenge' ? 'challenge' : 'solo',
                            challengeId: lesson.challengeId ?? lesson.id,
                            challengeName: lesson.title,
                          },
                        })
                      }
                      className="btn btn-secondary btn-sm text-xs"
                      title="Preview play"
                    >▶</button>
                    <button
                      onClick={() => navigate(`/challenge/host/lesson/${lesson.id}`)}
                      className="btn btn-secondary btn-sm text-xs"
                      title="Edit pack"
                    >✏️</button>
                    <button
                      onClick={() => handleDuplicate(lesson.id)}
                      className="btn btn-secondary btn-sm text-xs"
                      title="Duplicate"
                    >⧉</button>
                    <button
                      onClick={() => handleExport(lesson.id)}
                      className="btn btn-secondary btn-sm text-xs"
                      title="Export JSON"
                    >↓</button>
                    <button
                      onClick={() => setDeleteTarget(lesson)}
                      className="btn btn-danger btn-sm text-xs"
                      title="Delete"
                    >🗑</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={() => navigate('/results')} className="btn btn-secondary btn-md flex-1">
            📊 Result History
          </button>
        </div>
      </div>

      {deleteTarget && (
        <ConfirmDialog
          title="Delete Quiz Pack"
          message={`Delete "${deleteTarget.title}"? This cannot be undone.`}
          confirmLabel="Delete"
          danger
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </PageLayout>
  );
}
