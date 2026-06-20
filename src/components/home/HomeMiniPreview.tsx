const STEPS = [
  { label: 'Choose a topic' },
  { label: 'Answer with motion' },
  { label: 'Optional score proof' },
] as const;

export function HomeMiniPreview() {
  return (
    <section
      className="glass-card p-4 sm:p-5 space-y-3"
      data-testid="home-mini-preview"
      aria-label="How Motion Quiz works"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-white/35">How it works</p>
      <ol className="grid gap-2 sm:grid-cols-3 sm:gap-3">
        {STEPS.map((step, index) => (
          <li
            key={step.label}
            className="flex items-center gap-3 rounded-xl bg-white/[0.03] px-3 py-2 text-sm text-white/55"
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-white/70">
              {index + 1}
            </span>
            <span>{step.label}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
