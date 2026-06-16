interface Props {
  score: number;
}

export function ScoreBadge({ score }: Props) {
  return (
    <div
      className="flex items-center justify-center rounded-2xl bg-indigo-600/90 px-4 py-2 text-xl font-black text-white shadow-xl backdrop-blur"
      aria-label={`Score: ${score}`}
    >
      {score}
    </div>
  );
}
