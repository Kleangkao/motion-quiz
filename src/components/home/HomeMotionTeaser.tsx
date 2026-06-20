import { useEffect, useState } from 'react';

const TEASER_WORDS = ['fun', 'focused', 'fast', 'social', 'on-chain'] as const;

const TYPE_MS = 70;
const DELETE_MS = 45;
const PAUSE_MS = 1400;

type TeaserPhase = 'typing' | 'deleting';

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
    } else if (displayed.length > 0) {
      timer = setTimeout(() => setDisplayed(displayed.slice(0, -1)), DELETE_MS);
    } else {
      setWordIndex((index) => (index + 1) % TEASER_WORDS.length);
      setPhase('typing');
    }

    return () => clearTimeout(timer);
  }, [displayed, phase, wordIndex, reducedMotion]);

  if (reducedMotion) {
    return (
      <p className="text-sm text-white/40 text-center pt-2" data-testid="home-motion-teaser">
        Motion Quiz feels <span className="text-white/55">{TEASER_WORDS[0]}</span>
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
      <span className="inline-block min-w-[5.5rem] text-left text-white/55">
        <span className="inline whitespace-nowrap">
          {displayed}
          <span
            className="ml-px inline-block h-[0.85em] w-px translate-y-px bg-white/50 animate-pulse"
            aria-hidden
          />
        </span>
      </span>
    </p>
  );
}
