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
import { TopicPackIcon } from '@/components/play/TopicPackIcon';
import { HomeMotionTeaser } from '@/components/home/HomeMotionTeaser';

/** Hackathon polish: set true to restore Home quick-play topic cards. */
export const SHOW_HOME_QUICK_PLAY = false;

/** Hackathon polish: set true to restore the Continue last-topic button. */
export const SHOW_HOME_CONTINUE = false;

/** Hackathon polish: set false to hide the typewriter motion teaser. */
export const SHOW_HOME_MOTION_TEASER = true;

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
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-indigo-950 to-purple-950">
      <div className="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-4 pb-8 pt-4 sm:px-6 sm:pt-5">
        <header className="flex items-start justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <h1 className="text-3xl font-black text-white tracking-tight">Motion Quiz</h1>
          </div>
          <div className="relative flex-shrink-0 pt-1">
            <WalletHeaderButton />
          </div>
        </header>

        <div className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-4 py-6 sm:gap-5 sm:py-8 min-h-0">
        {SHOW_HOME_MOTION_TEASER && <HomeMotionTeaser />}

        {SHOW_HOME_CONTINUE && lastLesson && (
          <button
            onClick={() => startPack(lastLesson)}
            className="btn btn-primary btn-xl w-full"
          >
            ▶ Continue: {lastLesson.title}
          </button>
        )}

        {SHOW_HOME_QUICK_PLAY && featuredLessons.length > 0 && (
          <section className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/40">Quick play</p>
            <div className="grid gap-2">
              {featuredLessons.slice(0, 2).map((lesson) => (
                <button
                  key={lesson.id}
                  onClick={() => startPack(lesson)}
                  className="glass-card p-4 text-left flex items-center gap-3 active:scale-[0.99] transition hover:bg-white/15"
                >
                  <TopicPackIcon
                    packId={lesson.id}
                    icon={lesson.icon}
                    title={lesson.title}
                    size="sm"
                  />
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
        </div>

        <p className="mx-auto mt-2 w-full max-w-xl text-center text-xs leading-relaxed text-white/30 shrink-0">
          Camera processing stays on your device. Video is not uploaded. Wallet signing is off-chain only. No gas, no transfers.
        </p>
      </div>
    </div>
  );
}
