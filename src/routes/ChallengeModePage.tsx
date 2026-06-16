import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { importLesson, listLessons, exportLesson, updateLesson } from '@/storage/lessonStorage';
import { ensureStarterLessons, isChallengePack } from '@/storage/seedLessons';
import type { LessonPack } from '@/storage/types';
import { PageLayout } from '@/components/layout/PageLayout';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

export function ChallengeModePage() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [challenges, setChallenges] = useState<LessonPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [importError, setImportError] = useState<string | null>(null);
  const [importOk, setImportOk] = useState<string | null>(null);

  const load = useCallback(async () => {
    await ensureStarterLessons();
    const all = await listLessons();
    setChallenges(all.filter(isChallengePack));
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleImport = async (file: File) => {
    setImportError(null);
    setImportOk(null);
    try {
      const text = await file.text();
      const json = JSON.parse(text) as unknown;
      const lesson = await importLesson(json);
      await updateLesson(lesson.id, {
        packKind: 'challenge',
        challengeId: lesson.challengeId ?? lesson.id,
      });
      setImportOk(`Imported: ${lesson.title}`);
      load();
    } catch (e) {
      setImportError(e instanceof Error ? e.message : String(e));
    }
  };

  const startChallenge = (lesson: LessonPack) => {
    navigate(`/play/${lesson.id}/calibrate`, {
      state: {
        playMode: 'challenge' as const,
        challengeId: lesson.challengeId ?? lesson.id,
        challengeName: lesson.title,
      },
    });
  };

  return (
    <PageLayout title="Challenge Mode" backTo="/">
      <div className="space-y-6">
        <div className="glass-card p-5 space-y-3">
          <h3 className="font-bold text-white">Import a Challenge</h3>
          <p className="text-sm text-white/50">
            Hosts share challenge packs as JSON. Import the file here — no account or live room needed.
          </p>
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
          <button onClick={() => fileRef.current?.click()} className="btn btn-primary btn-lg w-full">
            📂 Import Challenge JSON
          </button>
          {importError && <p className="text-sm text-red-400">{importError}</p>}
          {importOk && <p className="text-sm text-green-400">{importOk}</p>}
        </div>

        <div className="flex gap-3">
          <button onClick={() => navigate('/challenge/host')} className="btn btn-secondary btn-md flex-1">
            Host a Challenge
          </button>
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : challenges.length === 0 ? (
          <div className="text-center py-10 space-y-2">
            <p className="text-4xl">🏁</p>
            <p className="text-white/60 text-sm">No challenges imported yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <h3 className="font-bold text-white">Your Challenges</h3>
            {challenges.map((lesson) => (
              <div key={lesson.id} className="glass-card p-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-white truncate">{lesson.title}</p>
                  <p className="text-xs text-white/40">
                    {lesson.questions.length} questions · ID {lesson.challengeId ?? lesson.id}
                  </p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => exportLesson(lesson.id)} className="btn btn-secondary btn-sm">
                    Export
                  </button>
                  <button onClick={() => startChallenge(lesson)} className="btn btn-primary btn-sm">
                    Play
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageLayout>
  );
}
