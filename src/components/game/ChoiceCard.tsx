import { forwardRef, useEffect, useState } from 'react';
import type { QuizChoice, LessonImageRef } from '@/storage/types';
import { getImageUrl } from '@/storage/imageStorage';

interface Props {
  choice: QuizChoice;
  side: 'left' | 'right';
  holdProgress?: number;
  isCandidate?: boolean;
  feedbackState?: 'correct' | 'wrong' | 'neutral';
  /** When true, card accepts touch/click. Default false = gesture-only display */
  touchEnabled?: boolean;
  onTouch?: () => void;
}

function ChoiceImage({ imageRef, alt }: { imageRef: LessonImageRef; alt: string }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    getImageUrl(imageRef).then(setSrc);
  }, [imageRef]);

  if (!src) {
    return <div className="h-24 w-24 rounded-xl bg-white/10 animate-pulse" />;
  }
  return (
    <img
      src={src}
      alt={alt}
      className="h-24 w-24 rounded-xl object-cover shadow pointer-events-none"
      draggable={false}
    />
  );
}

const feedbackColors = {
  correct: 'border-green-400 bg-green-500/20 shadow-green-400/40',
  wrong: 'border-red-400 bg-red-500/20 shadow-red-400/40',
  neutral: 'border-white/30 bg-white/10',
};

export const ChoiceCard = forwardRef<HTMLDivElement, Props>(function ChoiceCard({
  choice,
  side,
  holdProgress = 0,
  isCandidate = false,
  feedbackState = 'neutral',
  touchEnabled = false,
  onTouch,
}, ref) {
  const borderColor = feedbackColors[feedbackState];
  const emoji = side === 'left' ? '👈' : '👉';
  const pct = Math.round(holdProgress * 100);

  const className = `relative flex flex-col items-center gap-3 rounded-3xl border-2 p-4 shadow-2xl backdrop-blur-sm transition-all duration-150 ${borderColor} ${
    isCandidate ? 'scale-105 ring-2 ring-indigo-400/60' : ''
  } ${touchEnabled ? 'cursor-pointer active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60' : 'pointer-events-none'}`;

  const inner = (
    <>
      {isCandidate && holdProgress > 0 && (
        <svg
          className="absolute inset-0 h-full w-full pointer-events-none"
          viewBox="0 0 100 100"
          aria-hidden="true"
        >
          <circle
            cx="50" cy="50" r="46"
            fill="none"
            stroke="rgba(255,255,255,0.15)"
            strokeWidth="6"
          />
          <circle
            cx="50" cy="50" r="46"
            fill="none"
            stroke="#818cf8"
            strokeWidth="6"
            strokeDasharray={`${2 * Math.PI * 46}`}
            strokeDashoffset={`${2 * Math.PI * 46 * (1 - holdProgress)}`}
            strokeLinecap="round"
            transform="rotate(-90 50 50)"
            style={{ transition: 'stroke-dashoffset 0.1s linear' }}
          />
        </svg>
      )}

      {choice.image ? (
        <ChoiceImage imageRef={choice.image} alt={choice.altText ?? choice.label ?? ''} />
      ) : (
        <div className="flex h-24 w-24 items-center justify-center rounded-xl bg-white/10 text-5xl pointer-events-none">
          {emoji}
        </div>
      )}

      {choice.label && (
        <span className="max-w-[120px] text-center text-sm font-bold text-white drop-shadow pointer-events-none">
          {choice.label}
        </span>
      )}

      {isCandidate && (
        <span className="absolute -top-2 -right-2 rounded-full bg-indigo-500 px-2 py-0.5 text-xs font-bold text-white shadow pointer-events-none">
          {pct}%
        </span>
      )}
    </>
  );

  if (touchEnabled) {
    return (
      <div
        ref={ref}
        role="button"
        tabIndex={0}
        onClick={onTouch}
        onKeyDown={(e) => { if (e.key === 'Enter') onTouch?.(); }}
        className={className}
        aria-label={`${side === 'left' ? 'Left' : 'Right'} choice: ${choice.label ?? choice.altText ?? 'image'}`}
      >
        {inner}
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className={className}
      aria-label={`${side === 'left' ? 'Left' : 'Right'} choice: ${choice.label ?? choice.altText ?? 'image'}`}
      role="img"
    >
      {inner}
    </div>
  );
});
