import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSettings } from '@/storage/settingsStorage';
import { getLesson } from '@/storage/lessonStorage';
import {
  ensureStarterLessons,
  FEATURED_PLAY_PACK_IDS,
  isRetiredBuiltinPack,
  playStateForLesson,
} from '@/storage/seedLessons';
import type { LessonPack } from '@/storage/types';
import { WalletHeaderButton } from '@/components/wallet/WalletHeaderButton';

export function HomePage() {
  const navigate = useNavigate();
  const [lastLesson, setLastLesson] = useState<LessonPack | null>(null);
  const [featuredLessons, setFeaturedLessons] = useState<LessonPack[]>([]);

  useEffect(() => {
    async function load() {
      await ensureStarterLessons();
      const settings = await getSettings();
      if (settings.lastUsedLessonId) {
        const found = await getLesson(settings.lastUsedLessonId);
        if (found && !isRetiredBuiltinPack(found)) setLastLesson(found);
      }
      const featured = await Promise.all(
        FEATURED_PLAY_PACK_IDS.map((id) => getLesson(id)),
      );
      setFeaturedLessons(featured.filter(Boolean) as LessonPack[]);
    }
    load();
  }, []);

  const startPack = (lesson: LessonPack) => {
    navigate(`/play/${lesson.id}/calibrate`, {
      state: playStateForLesson(lesson),
    });
  };

  const primaryModes = [
    { path: '/play', emoji: '🎮', title: 'Start Quiz', desc: 'Pick a topic and play' },
    { path: '/scores', emoji: '🏆', title: 'Scores', desc: 'Leaderboard & recorded Solana scores' },
    { path: '/settings', emoji: '⚙', title: 'Settings', desc: 'Camera & gesture tuning' },
  ] as const;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-indigo-950 to-purple-950 flex flex-col p-5 pb-8 gap-5 max-w-lg mx-auto">
      <header className="pt-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-3xl font-black text-white tracking-tight">Motion Quiz</h1>
        </div>
        <div className="relative flex-shrink-0 pt-1">
          <WalletHeaderButton />
        </div>
      </header>

      {lastLesson && (
        <button
          onClick={() => startPack(lastLesson)}
          className="btn btn-primary btn-xl w-full"
        >
          ▶ Continue: {lastLesson.title}
        </button>
      )}

      {featuredLessons.length > 0 && (
        <section className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-white/40">Quick play</p>
          <div className="grid gap-2">
            {featuredLessons.slice(0, 2).map((lesson) => (
              <button
                key={lesson.id}
                onClick={() => startPack(lesson)}
                className="glass-card p-4 text-left flex items-center gap-3 active:scale-[0.99] transition hover:bg-white/15"
              >
                <span className="text-2xl">
                  {lesson.id === 'islanddao-challenge' ? '🏝️' : '◎'}
                </span>
                <div className="font-bold text-white">{lesson.title}</div>
              </button>
            ))}
          </div>
        </section>
      )}

      <nav className="grid gap-3">
        {primaryModes.map(({ path, emoji, title, desc }) => (
          <button
            key={path}
            onClick={() => navigate(path)}
            className="glass-card p-4 text-left flex items-center gap-4 active:scale-[0.99] transition hover:bg-white/15"
          >
            <span className="text-2xl">{emoji}</span>
            <div>
              <div className="font-bold text-white">{title}</div>
              <div className="text-xs text-white/45">{desc}</div>
            </div>
          </button>
        ))}
      </nav>

      <p className="text-xs text-white/30 text-center leading-relaxed">
        Camera processing stays on your device. Video is not uploaded. Wallet signing is off-chain only. No gas, no transfers.
      </p>
    </div>
  );
}
