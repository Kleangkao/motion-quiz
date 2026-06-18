import type { BinaryChoiceVariant } from './binaryChoiceLabel';

interface Props {
  variant: BinaryChoiceVariant;
}

/** 1:1 badge — green check (SAFE/TRUE) or red X (RISKY/FALSE). */
export function BinaryChoiceIcon({ variant }: Props) {
  const boxClass =
    'mx-auto flex aspect-square w-16 shrink-0 items-center justify-center rounded-2xl sm:w-20';

  if (variant === 'positive') {
    return (
      <div
        className={`${boxClass} bg-emerald-500/15 ring-2 ring-emerald-400/75`}
        aria-hidden
      >
        <svg
          viewBox="0 0 24 24"
          className="h-[58%] w-[58%] text-emerald-400"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 13l4 4L19 7" />
        </svg>
      </div>
    );
  }

  return (
    <div
      className={`${boxClass} bg-rose-500/15 ring-2 ring-rose-400/75`}
      aria-hidden
    >
      <svg
        viewBox="0 0 24 24"
        className="h-[58%] w-[58%] text-rose-400"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M6 6l12 12M18 6 6 18" />
      </svg>
    </div>
  );
}
