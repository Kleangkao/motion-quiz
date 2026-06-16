interface Props {
  remainingMs: number;
}

export function TimerBadge({ remainingMs }: Props) {
  const totalSec = Math.max(0, Math.ceil(remainingMs / 1000));
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  const display = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const isLow = remainingMs < 15000;

  return (
    <div
      className={`flex items-center justify-center rounded-2xl px-5 py-2 text-2xl font-black tabular-nums shadow-xl ${
        isLow
          ? 'animate-pulse bg-red-600/90 text-white'
          : 'bg-black/60 text-white backdrop-blur'
      }`}
      aria-label={`Time remaining: ${display}`}
    >
      {display}
    </div>
  );
}
