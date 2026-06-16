import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listLessons } from '@/storage/lessonStorage';
import { ensureStarterLessons, isSoloPack } from '@/storage/seedLessons';
import type { LessonPack } from '@/storage/types';
import { PageLayout } from '@/components/layout/PageLayout';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

export function SoloPlayPage() {
  const navigate = useNavigate();
  const [lessons, setLessons] = useState<LessonPack[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      await ensureStarterLessons();
      const all = await listLessons();
      setLessons(all.filter(isSoloPack));
      setLoading(false);
    }
    load();
  }, []);

  const startQuiz = (lesson: LessonPack) => {
    navigate(`/play/${lesson.id}/calibrate`, {
      state: { playMode: 'solo' as const },
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner label="Loading quiz packs…" size="lg" />
      </div>
    );
  }

  return (
    <PageLayout title="Solo Play" backTo="/">
      <p className="text-sm text-white/50 mb-4">
        Pick a quiz pack, calibrate your camera, then point left or right to answer.
      </p>
      <div className="grid gap-4">
        {lessons.map((lesson) => (
          <button
            key={lesson.id}
            onClick={() => startQuiz(lesson)}
            className="glass-card p-5 text-left transition hover:bg-white/20 active:scale-[0.99]"
          >
            <div className="flex items-start gap-3">
              <span className="text-3xl">{lesson.id.startsWith('seeker_') ? '📱' : '🎯'}</span>
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
    </PageLayout>
  );
}
