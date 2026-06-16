import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listLessons } from '@/storage/lessonStorage';
import { ensureStarterLessons } from '@/storage/seedLessons';
import type { LessonPack } from '@/storage/types';
import { PageLayout } from '@/components/layout/PageLayout';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

export function LessonSelectPage() {
  const navigate = useNavigate();
  const [lessons, setLessons] = useState<LessonPack[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      await ensureStarterLessons();
      const all = await listLessons();
      setLessons(all);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner label="Loading lessons…" size="lg" />
      </div>
    );
  }

  return (
    <PageLayout title="Choose a Lesson" backTo="/">
      {lessons.length === 0 ? (
        <div className="text-center py-16 space-y-4">
          <p className="text-4xl">📭</p>
          <p className="text-white/60">No lessons yet.</p>
          <button onClick={() => navigate('/teacher/lesson/new')} className="btn btn-primary btn-lg">
            Create your first lesson
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {lessons.map((lesson) => (
            <button
              key={lesson.id}
              onClick={() => navigate(`/play/${lesson.id}/calibrate`)}
              className="glass-card p-5 text-left transition hover:bg-white/20 hover:scale-[1.02] active:scale-[0.99]"
            >
              <div className="flex items-start gap-3">
                <span className="text-3xl">📖</span>
                <div>
                  <h2 className="font-bold text-white text-lg">{lesson.title}</h2>
                  {lesson.description && (
                    <p className="text-sm text-white/50 mt-1 line-clamp-2">{lesson.description}</p>
                  )}
                  <div className="mt-2 flex gap-3 text-xs text-white/40">
                    <span>⏱ {Math.floor(lesson.durationSeconds / 60)}m {lesson.durationSeconds % 60}s</span>
                    <span>❓ {lesson.questions.length} questions</span>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </PageLayout>
  );
}
