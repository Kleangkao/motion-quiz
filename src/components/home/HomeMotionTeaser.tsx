import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { STARTER_LESSONS } from '@/data/starterLessons';
import { playStateForLesson } from '@/storage/seedLessons';

export type TeaserPhase = 'typing' | 'deleting' | 'emptyHold';

export interface TeaserTopicTheme {
  title: string;
  packId: string;
  /** CSS linear-gradient for topic text — inspired by pack logo colors. */
  gradient: string;
  caretColor: string;
}

/** Featured topic labels, routes, and logo-inspired accents — matches Play order. */
export const TEASER_TOPICS: readonly TeaserTopicTheme[] = [
  {
    title: 'Solana',
    packId: 'solana-basics',
    gradient: 'linear-gradient(90deg, #9945FF, #14F195)',
    caretColor: '#14F195',
  },
  {
    title: 'IslandDAO',
    packId: 'islanddao-challenge',
    gradient: 'linear-gradient(90deg, #8fd4a8, #c8f0d4)',
    caretColor: '#b8e6c8',
  },
  {
    title: 'Ride Markets',
    packId: 'ride-market',
    gradient: 'linear-gradient(90deg, #84cc16, #ef4444)',
    caretColor: '#f97316',
  },
  {
    title: 'DoubleZero',
    packId: 'doublezero',
    gradient: 'linear-gradient(90deg, #22c55e, #3b82f6, #ef4444)',
    caretColor: '#60a5fa',
  },
  {
    title: 'Play Solana',
    packId: 'play-solana',
    gradient: 'linear-gradient(90deg, #a855f7, #22d3ee, #84cc16)',
    caretColor: '#22d3ee',
  },
  {
    title: 'Star Atlas',
    packId: 'star-atlas',
    gradient: 'linear-gradient(90deg, #e2e8f0, #22d3ee)',
    caretColor: '#67e8f9',
  },
  {
    title: 'MonkeDAO',
    packId: 'monkedao',
    gradient: 'linear-gradient(90deg, #d4a574, #f5f5dc)',
    caretColor: '#f5f5dc',
  },
] as const;

const TYPE_MS = 70;
const DELETE_MS = 45;
const PAUSE_MS = 1400;
export const EMPTY_HOLD_MS = 500;

const PREFIX_CLASS = 'text-sm sm:text-base font-medium text-white/40';
const SEPARATOR_CLASS = 'text-white/25';
const HERO_CLASS =
  'w-full max-w-full overflow-hidden px-1 text-center min-h-[3.25rem] sm:min-h-[4.5rem]';
const LINE_CLASS =
  'flex flex-wrap items-baseline justify-center gap-x-1.5 sm:gap-x-2 max-w-full';
const TOPIC_TEXT_CLASS =
  'text-[clamp(1.75rem,8vw,3rem)] font-black tracking-tight leading-none break-words';

export function isTopicShortcutActive(displayed: string, phase: TeaserPhase): boolean {
  return displayed.length > 0 && phase !== 'emptyHold';
}

export function topicTextStyle(theme: TeaserTopicTheme): CSSProperties {
  return {
    backgroundImage: theme.gradient,
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    color: 'transparent',
  };
}

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

function TopicCaret({ color }: { color: string }) {
  return (
    <span
      className="ml-px inline-block h-[0.85em] w-px translate-y-px animate-pulse"
      style={{ backgroundColor: color }}
      aria-hidden
    />
  );
}

interface TopicContentProps {
  text: string;
  showCaret: boolean;
  theme: TeaserTopicTheme;
  clickable: boolean;
  ariaLabel: string;
  onStart: () => void;
}

function TopicContent({
  text,
  showCaret,
  theme,
  clickable,
  ariaLabel,
  onStart,
}: TopicContentProps) {
  const content = (
    <>
      <span className={TOPIC_TEXT_CLASS} style={topicTextStyle(theme)}>
        {text}
      </span>
      {showCaret && <TopicCaret color={theme.caretColor} />}
    </>
  );

  if (clickable) {
    return (
      <button
        type="button"
        onClick={onStart}
        className="inline-flex max-w-full items-baseline cursor-pointer text-left hover:underline decoration-white/20 underline-offset-4"
        aria-label={ariaLabel}
      >
        {content}
      </button>
    );
  }

  return <span className="inline-flex max-w-full items-baseline">{content}</span>;
}

export function HomeMotionTeaser() {
  const navigate = useNavigate();
  const reducedMotion = usePrefersReducedMotion();
  const [topicIndex, setTopicIndex] = useState(0);
  const [displayed, setDisplayed] = useState('');
  const [phase, setPhase] = useState<TeaserPhase>('typing');

  const currentTopic = TEASER_TOPICS[topicIndex];
  const fullTitle = currentTopic.title;
  const shortcutActive = isTopicShortcutActive(displayed, phase);

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

  const startTopic = (topic: TeaserTopicTheme) => {
    const lesson = lessonByPackId.get(topic.packId);
    if (!lesson) return;
    navigate(`/play/${topic.packId}/calibrate`, {
      state: playStateForLesson(lesson),
    });
  };

  if (reducedMotion) {
    const staticTopic = TEASER_TOPICS[0];
    return (
      <section className={HERO_CLASS} data-testid="home-motion-teaser">
        <p className={LINE_CLASS}>
          <span className={PREFIX_CLASS}>Quiz</span>
          <span className={SEPARATOR_CLASS}>·</span>
          <TopicContent
            text={staticTopic.title}
            showCaret={false}
            theme={staticTopic}
            clickable
            ariaLabel={`Start ${staticTopic.title} quiz`}
            onStart={() => startTopic(staticTopic)}
          />
        </p>
      </section>
    );
  }

  return (
    <section className={HERO_CLASS} data-testid="home-motion-teaser">
      <p className={LINE_CLASS}>
        <span className={PREFIX_CLASS}>Quiz</span>
        <span className={SEPARATOR_CLASS}>·</span>
        <TopicContent
          text={displayed}
          showCaret={displayed.length > 0}
          theme={currentTopic}
          clickable={shortcutActive}
          ariaLabel={`Start ${fullTitle} quiz`}
          onStart={() => startTopic(currentTopic)}
        />
      </p>
    </section>
  );
}
