interface Props {
  progress: number;
  className?: string;
}

/** Horizontal green hold bar shown above answer cards during gesture lock. */
export function HoldProgressBar({ progress, className = '' }: Props) {
  const pct = Math.round(Math.max(0, Math.min(1, progress)) * 100);

  return (
    <div className={`w-44 flex items-center gap-2 pointer-events-none ${className}`}>
      <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-black/60 ring-1 ring-white/15">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-green-500 to-emerald-300 transition-[width] duration-100 ease-linear"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-9 text-right text-xs font-bold tabular-nums text-green-300">{pct}%</span>
    </div>
  );
}
