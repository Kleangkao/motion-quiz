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
  /** When set, renders solid text instead of gradient. */
  textColor?: string;
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
    textColor: '#bbeac3',
    caretColor: '#bbeac3',
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
    textColor: '#ffffff',
    caretColor: '#ffffff',
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
    textColor: '#ffffff',
    caretColor: '#ffffff',
  },
  {
    title: 'MonkeDAO',
    packId: 'monkedao',
    gradient: 'linear-gradient(90deg, #d4a574, #f5f5dc)',
    textColor: '#f3efcd',
    caretColor: '#f3efcd',
  },
] as const;

const TYPE_MS = 70;
const DELETE_MS = 45;
const PAUSE_MS = 1400;
export const EMPTY_HOLD_MS = 500;

const PREFIX_CLASS = 'text-sm sm:text-base font-medium leading-none text-white/40';
const SEPARATOR_CLASS = 'leading-none text-white/25';
const LABEL_CLASS = 'inline-flex shrink-0 items-baseline gap-x-1.5 sm:gap-x-2';
const HERO_CLASS =
  'flex w-full justify-center overflow-hidden px-1 min-h-[3.25rem] sm:min-h-[4.5rem]';
const LINE_CLASS =
  'inline-flex w-full max-w-[min(100%,22rem)] sm:max-w-[min(100%,26rem)] items-baseline justify-start gap-x-1.5 sm:gap-x-2';
const TOPIC_TEXT_CLASS =
  'text-[clamp(1.75rem,8vw,3rem)] font-black tracking-tight leading-none break-words';
const TOPIC_SLOT_CLASS =
  'inline-flex min-w-0 min-h-[clamp(1.75rem,8vw,3rem)] items-baseline leading-none';

export function isTopicShortcutActive(displayed: string, phase: TeaserPhase): boolean {
  return displayed.length > 0 && phase !== 'emptyHold';
}

export function topicTextStyle(theme: TeaserTopicTheme): CSSProperties {
  if (theme.textColor) {
    return { color: theme.textColor };
  }
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
      className="ml-[0.08em] inline-block h-[0.9em] w-[0.07em] animate-caret-blink motion-reduce:animate-none motion-reduce:opacity-100"
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
    <span className={`inline-flex items-baseline ${TOPIC_TEXT_CLASS}`}>
      <span style={topicTextStyle(theme)}>{text}</span>
      {showCaret && <TopicCaret color={theme.caretColor} />}
    </span>
  );

  if (clickable) {
    return (
      <span className={TOPIC_SLOT_CLASS}>
        <button
          type="button"
          onClick={onStart}
          className="inline-flex min-w-0 max-w-full cursor-pointer border-0 bg-transparent p-0 text-left leading-none align-baseline hover:underline decoration-white/20 underline-offset-4"
          aria-label={ariaLabel}
        >
          {content}
        </button>
      </span>
    );
  }

  return <span className={TOPIC_SLOT_CLASS}>{content}</span>;
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
          <span className={LABEL_CLASS}>
            <span className={PREFIX_CLASS}>Quiz</span>
            <span className={SEPARATOR_CLASS}>·</span>
          </span>
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
        <span className={LABEL_CLASS}>
          <span className={PREFIX_CLASS}>Quiz</span>
          <span className={SEPARATOR_CLASS}>·</span>
        </span>
        <TopicContent
          text={displayed}
          showCaret
          theme={currentTopic}
          clickable={shortcutActive}
          ariaLabel={`Start ${fullTitle} quiz`}
          onStart={() => startTopic(currentTopic)}
        />
      </p>
    </section>
  );
}
