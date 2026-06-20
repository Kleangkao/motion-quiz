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
import { TopicPackIcon } from '@/components/play/TopicPackIcon';

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
    <div className="glass-card p-5 flex items-center gap-3 transform-gpu origin-center transition-transform duration-200 hover:-translate-y-1 focus-within:-translate-y-1 active:scale-[0.995] motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:focus-within:translate-y-0">
      <button
        onClick={onPlay}
        className="flex flex-1 min-w-0 items-center gap-3 text-left outline-none"
      >
        <TopicPackIcon packId={lesson.id} icon={lesson.icon} title={lesson.title} size="md" />
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
    <PageLayout title="Choose a quiz topic" backTo="/">
      <p className="text-sm text-white/50 mb-6">
        Pick a topic and answer with motion.
      </p>

      <div className="space-y-8">
        <section aria-labelledby="featured-topics-heading" className="space-y-4">
          <h2 id="featured-topics-heading" className="text-base font-semibold text-white">
            Featured topics
          </h2>
          <div className="grid gap-4">
            {featuredLessons.map((lesson) => (
              <TopicCard key={lesson.id} lesson={lesson} onPlay={() => startQuiz(lesson)} />
            ))}
          </div>
        </section>

        {userTopics.length > 0 && (
          <section aria-labelledby="your-topics-heading" className="space-y-4">
            <h2 id="your-topics-heading" className="text-base font-semibold text-white">
              Your topics
            </h2>
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

        <div className="border-t border-white/10" role="separator" />

        <section
          aria-labelledby="create-your-own-heading"
          className="rounded-xl border border-white/5 bg-white/[0.03] p-4 space-y-4"
        >
          <div>
            <h2 id="create-your-own-heading" className="text-sm font-semibold text-white/70">
              Create your own
            </h2>
            <p className="text-xs text-white/40 mt-1">
              Optional: build a custom topic or import a shared pack file.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => navigate('/play/create-topic')}
              className="btn btn-secondary btn-sm w-full justify-center"
            >
              Create Topic
            </button>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="btn btn-secondary btn-sm w-full justify-center"
            >
              Import Pack
            </button>
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
          {importError && <p className="text-xs text-red-400">{importError}</p>}
          {importOk && <p className="text-xs text-green-400">{importOk}</p>}
        </section>
      </div>
    </PageLayout>
  );
}
