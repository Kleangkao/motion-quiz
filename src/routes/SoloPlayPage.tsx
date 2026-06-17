import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { importLesson, listLessons, exportLesson } from '@/storage/lessonStorage';
import {
  ensureStarterLessons,
  FEATURED_PLAY_PACK_IDS,
  isFeaturedPlayPack,
  isVisibleInPlay,
  playStateForLesson,
} from '@/storage/seedLessons';
import type { LessonPack } from '@/storage/types';
import { PageLayout } from '@/components/layout/PageLayout';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

function packEmoji(lesson: LessonPack): string {
  if (lesson.id === 'islanddao-challenge') return '🏝️';
  if (lesson.id === 'seeker_mobile_basics') return '📱';
  if (lesson.id === 'solana-basics') return '◎';
  return '🎯';
}

function TopicCard({
  lesson,
  onPlay,
  onEdit,
  onExport,
}: {
  lesson: LessonPack;
  onPlay: () => void;
  onEdit?: () => void;
  onExport?: () => void;
}) {
  return (
    <div className="glass-card p-5 flex items-start gap-3">
      <button
        onClick={onPlay}
        className="flex flex-1 min-w-0 items-start gap-3 text-left transition active:scale-[0.99]"
      >
        <span className="text-3xl">{packEmoji(lesson)}</span>
        <div className="min-w-0">
          <h2 className="font-bold text-white text-lg truncate">{lesson.title}</h2>
          {lesson.description && (
            <p className="text-sm text-white/50 mt-1 line-clamp-2">{lesson.description}</p>
          )}
        </div>
      </button>
      {(onEdit || onExport) && (
        <div className="flex flex-shrink-0 flex-col gap-2 sm:flex-row">
          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="btn btn-secondary btn-sm text-xs"
              title="Edit this topic"
              aria-label="Edit topic"
            >
              Edit
            </button>
          )}
          {onExport && (
            <button
              type="button"
              onClick={onExport}
              className="btn btn-secondary btn-sm text-xs"
              title="Save this topic as a file you can import again later"
              aria-label="Download topic for import"
            >
              Download
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function SoloPlayPage() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [lessons, setLessons] = useState<LessonPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [importError, setImportError] = useState<string | null>(null);
  const [importOk, setImportOk] = useState<string | null>(null);

  const load = useCallback(async () => {
    await ensureStarterLessons();
    const all = await listLessons();
    setLessons(all.filter(isVisibleInPlay));
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const featuredLessons = useMemo(() => {
    const byId = new Map(lessons.map((l) => [l.id, l]));
    return FEATURED_PLAY_PACK_IDS.map((id) => byId.get(id)).filter(Boolean) as LessonPack[];
  }, [lessons]);

  const userTopics = useMemo(
    () => lessons.filter((lesson) => !isFeaturedPlayPack(lesson)),
    [lessons],
  );

  const startQuiz = (lesson: LessonPack) => {
    navigate(`/play/${lesson.id}/calibrate`, {
      state: playStateForLesson(lesson),
    });
  };

  const handleImport = async (file: File) => {
    setImportError(null);
    setImportOk(null);
    try {
      const text = await file.text();
      const json = JSON.parse(text) as unknown;
      const lesson = await importLesson(json);
      setImportOk(`Imported: ${lesson.title}`);
      load();
    } catch (e) {
      setImportError(e instanceof Error ? e.message : String(e));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner label="Loading quiz packs…" size="lg" />
      </div>
    );
  }

  return (
    <PageLayout title="Play" backTo="/">
      <p className="text-sm text-white/50 mb-4">
        Pick a quiz, choose your camera, then point left or right to answer.
      </p>

      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={() => navigate('/results')}
          className="btn btn-secondary btn-sm flex-1"
        >
          Results
        </button>
        <button
          type="button"
          onClick={() => navigate('/leaderboard')}
          className="btn btn-secondary btn-sm flex-1"
        >
          Leaderboard
        </button>
      </div>

      <div className="space-y-6">
        <section className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-white/40">
            Featured packs
          </h3>
          <div className="grid gap-4">
            {featuredLessons.map((lesson) => (
              <TopicCard key={lesson.id} lesson={lesson} onPlay={() => startQuiz(lesson)} />
            ))}
          </div>
        </section>

        {userTopics.length > 0 && (
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-white/40">
              Your topics
            </h3>
            <div className="grid gap-4">
              {userTopics.map((lesson) => (
                <TopicCard
                  key={lesson.id}
                  lesson={lesson}
                  onPlay={() => startQuiz(lesson)}
                  onEdit={() => navigate(`/play/edit-topic/${lesson.id}`)}
                  onExport={() => exportLesson(lesson.id)}
                />
              ))}
            </div>
          </section>
        )}

        <section className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
          <button
            type="button"
            onClick={() => navigate('/play/create-topic')}
            className="btn btn-secondary btn-md w-full"
          >
            Create Topic
          </button>

          <div className="border-t border-white/10 pt-3 space-y-2">
            <div>
              <h3 className="text-sm font-semibold text-white">Import Topic</h3>
              <p className="text-xs text-white/45 mt-1">
                Advanced: load a shared topic JSON file.
              </p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleImport(f);
                e.target.value = '';
              }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="btn btn-secondary btn-sm w-full"
            >
              Import from JSON
            </button>
            {importError && <p className="text-xs text-red-400">{importError}</p>}
            {importOk && <p className="text-xs text-green-400">{importOk}</p>}
          </div>
        </section>
      </div>
    </PageLayout>
  );
}
