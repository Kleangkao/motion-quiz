import { useEffect, useState } from 'react';

const TEASER_WORDS = ['fun', 'focused', 'fast', 'social', 'on-chain'] as const;

const TYPE_MS = 70;
const DELETE_MS = 45;
const PAUSE_MS = 1400;
export const EMPTY_HOLD_MS = 500;

type TeaserPhase = 'typing' | 'deleting' | 'emptyHold';

const DYNAMIC_WORD_CLASS =
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
  const reducedMotion = usePrefersReducedMotion();
  const [wordIndex, setWordIndex] = useState(0);
  const [displayed, setDisplayed] = useState('');
  const [phase, setPhase] = useState<TeaserPhase>('typing');

  useEffect(() => {
    if (reducedMotion) return;

    const word = TEASER_WORDS[wordIndex];
    let timer: ReturnType<typeof setTimeout>;

    if (phase === 'typing') {
      if (displayed.length < word.length) {
        timer = setTimeout(
          () => setDisplayed(word.slice(0, displayed.length + 1)),
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
        setWordIndex((index) => (index + 1) % TEASER_WORDS.length);
        setPhase('typing');
      }, EMPTY_HOLD_MS);
    }

    return () => clearTimeout(timer);
  }, [displayed, phase, wordIndex, reducedMotion]);

  if (reducedMotion) {
    return (
      <p className="text-sm text-white/40 text-center pt-2" data-testid="home-motion-teaser">
        Motion Quiz feels{' '}
        <span className={DYNAMIC_WORD_CLASS}>{TEASER_WORDS[0]}</span>
      </p>
    );
  }

  return (
    <p
      className="text-sm text-white/40 text-center pt-2"
      data-testid="home-motion-teaser"
      aria-live="polite"
    >
      Motion Quiz feels{' '}
      <span className={`inline-block min-w-[5.5rem] text-left ${DYNAMIC_WORD_CLASS}`}>
        <span className="inline whitespace-nowrap">
          {displayed}
          <span
            className="ml-px inline-block h-[0.85em] w-px translate-y-px bg-fuchsia-300/70 animate-pulse"
            aria-hidden
          />
        </span>
      </span>
    </p>
  );
}
