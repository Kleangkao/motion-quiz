import { forwardRef, useEffect, useState } from 'react';
import type { QuizChoice, LessonImageRef } from '@/storage/types';
import { getImageUrl } from '@/storage/imageStorage';
import { HoldProgressBar } from '@/components/game/HoldProgressBar';

interface Props {
  choice: QuizChoice;
  side: 'left' | 'right';
  holdProgress?: number;
  isCandidate?: boolean;
  feedbackState?: 'correct' | 'wrong' | 'neutral';
  touchEnabled?: boolean;
  onTouch?: () => void;
}

function ChoiceImage({ imageRef, alt }: { imageRef: LessonImageRef; alt: string }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    getImageUrl(imageRef).then(setSrc);
  }, [imageRef]);

  if (!src) {
    return <div className="play-flow-choice-image h-28 w-28 rounded-xl bg-black/50 animate-pulse" />;
  }
  return (
    <img
      src={src}
      alt={alt}
      className="play-flow-choice-image h-28 w-28 rounded-xl object-cover shadow-lg pointer-events-none ring-1 ring-white/15"
      draggable={false}
    />
  );
}

const feedbackStyles = {
  correct: 'border-emerald-400/80 bg-emerald-950/85 shadow-[0_0_24px_rgba(52,211,153,0.25)]',
  wrong: 'border-rose-400/80 bg-rose-950/85 shadow-[0_0_24px_rgba(251,113,133,0.2)]',
  neutral: 'border-white/35 bg-slate-950/88 shadow-[0_12px_40px_rgba(0,0,0,0.55)]',
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
  const label = choice.label ?? choice.altText ?? '';
  const sideLabel = side === 'left' ? 'Left' : 'Right';
  const showHold = isCandidate && holdProgress > 0;

  const cardClass = `
    play-flow-choice-card relative flex w-48 min-h-[7.25rem] flex-col items-center justify-center gap-2.5
    rounded-2xl border-2 px-4 py-4 backdrop-blur-md transition-all duration-150
    ${feedbackStyles[feedbackState]}
    ${isCandidate ? 'border-emerald-400/70' : ''}
    ${touchEnabled ? 'cursor-pointer active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70' : 'pointer-events-none'}
  `;

  const body = (
    <>
      <span className="absolute top-2 left-2 rounded-md bg-black/45 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white/55">
        {sideLabel}
      </span>

      {choice.image ? (
        <>
          <ChoiceImage imageRef={choice.image} alt={choice.altText ?? choice.label ?? ''} />
          {label && (
            <span className="max-w-full text-center text-sm font-semibold leading-snug text-white line-clamp-3">
              {label}
            </span>
          )}
        </>
      ) : label ? (
        <span className="mt-3 px-1 text-center text-[15px] font-semibold leading-snug text-white line-clamp-5 [text-wrap:balance]">
          {label}
        </span>
      ) : (
        <div className="h-20 w-20 rounded-xl bg-black/40" aria-hidden="true" />
      )}
    </>
  );

  const card = touchEnabled ? (
    <div
      ref={ref}
      role="button"
      tabIndex={0}
      onClick={onTouch}
      onKeyDown={(e) => { if (e.key === 'Enter') onTouch?.(); }}
      className={cardClass}
      aria-label={`${sideLabel} choice: ${label || 'image'}`}
    >
      {body}
    </div>
  ) : (
    <div
      ref={ref}
      className={cardClass}
      aria-label={`${sideLabel} choice: ${label || 'image'}`}
      role="img"
    >
      {body}
    </div>
  );

  return (
    <div className="flex flex-col items-center gap-2">
      {showHold && <HoldProgressBar progress={holdProgress} />}
      {card}
    </div>
  );
});
