import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { STARTER_LESSONS } from '@/data/starterLessons';
import { playStateForLesson } from '@/storage/seedLessons';

/** Featured topic labels and pack IDs — matches Play order. */
export const TEASER_TOPICS = [
  { title: 'Solana', packId: 'solana-basics' },
  { title: 'IslandDAO', packId: 'islanddao-challenge' },
  { title: 'Ride Markets', packId: 'ride-market' },
  { title: 'DoubleZero', packId: 'doublezero' },
  { title: 'Play Solana', packId: 'play-solana' },
  { title: 'Star Atlas', packId: 'star-atlas' },
  { title: 'MonkeDAO', packId: 'monkedao' },
] as const;

const TYPE_MS = 70;
const DELETE_MS = 45;
const PAUSE_MS = 1400;
export const EMPTY_HOLD_MS = 500;

type TeaserPhase = 'typing' | 'deleting' | 'emptyHold';

const PREFIX_CLASS = 'text-xs text-white/35 font-normal';
const SEPARATOR_CLASS = 'text-white/25';
const TOPIC_CLASS =
  'text-base font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-violet-300 to-fuchsia-300';

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;

    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  return reduced;
}

export function HomeMotionTeaser() {
  const navigate = useNavigate();
  const reducedMotion = usePrefersReducedMotion();
  const [topicIndex, setTopicIndex] = useState(0);
  const [displayed, setDisplayed] = useState('');
  const [phase, setPhase] = useState<TeaserPhase>('typing');

  const currentTopic = TEASER_TOPICS[topicIndex];
  const fullTitle = currentTopic.title;

  const isFullyTyped = phase === 'typing' && displayed === fullTitle;

  const lessonByPackId = useMemo(
    () => new Map(STARTER_LESSONS.map((lesson) => [lesson.id, lesson])),
    [],
  );

  useEffect(() => {
    if (reducedMotion) return;

    let timer: ReturnType<typeof setTimeout>;

    if (phase === 'typing') {
      if (displayed.length < fullTitle.length) {
        timer = setTimeout(
          () => setDisplayed(fullTitle.slice(0, displayed.length + 1)),
          TYPE_MS,
        );
      } else {
        timer = setTimeout(() => setPhase('deleting'), PAUSE_MS);
      }
    } else if (phase === 'deleting') {
      if (displayed.length > 0) {
        timer = setTimeout(() => setDisplayed(displayed.slice(0, -1)), DELETE_MS);
      } else {
        setPhase('emptyHold');
      }
    } else {
      timer = setTimeout(() => {
        setTopicIndex((index) => (index + 1) % TEASER_TOPICS.length);
        setPhase('typing');
      }, EMPTY_HOLD_MS);
    }

    return () => clearTimeout(timer);
  }, [displayed, phase, fullTitle, reducedMotion]);

  const startTopic = () => {
    const lesson = lessonByPackId.get(currentTopic.packId);
    if (!lesson) return;
    navigate(`/play/${currentTopic.packId}/calibrate`, {
      state: playStateForLesson(lesson),
    });
  };

  if (reducedMotion) {
    return (
      <p className="text-center pt-2" data-testid="home-motion-teaser">
        <span className={PREFIX_CLASS}>Motion Quiz</span>
        <span className={SEPARATOR_CLASS}> · </span>
        <span className={TOPIC_CLASS}>{TEASER_TOPICS[0].title}</span>
      </p>
    );
  }

  const topicContent = (
    <>
      {displayed}
      <span
        className="ml-px inline-block h-[0.85em] w-px translate-y-px bg-fuchsia-300/70 animate-pulse"
        aria-hidden
      />
    </>
  );

  return (
    <p
      className="text-center pt-2"
      data-testid="home-motion-teaser"
      aria-live="polite"
    >
      <span className={PREFIX_CLASS}>Motion Quiz</span>
      <span className={SEPARATOR_CLASS}> · </span>
      <span className={`inline-block min-w-[8.5rem] text-left ${TOPIC_CLASS}`}>
        <span className="inline whitespace-nowrap">
          {isFullyTyped ? (
            <button
              type="button"
              onClick={startTopic}
              className="cursor-pointer text-left hover:underline decoration-white/20 underline-offset-2"
              aria-label={`Start ${fullTitle} quiz`}
            >
              {topicContent}
            </button>
          ) : (
            topicContent
          )}
        </span>
      </span>
    </p>
  );
}
