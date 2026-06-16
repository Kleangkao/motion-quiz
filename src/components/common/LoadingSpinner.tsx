interface Props {
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = { sm: 'h-6 w-6', md: 'h-10 w-10', lg: 'h-16 w-16' };

export function LoadingSpinner({ label, size = 'md' }: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div
        className={`${sizeMap[size]} animate-spin rounded-full border-4 border-white/20 border-t-indigo-400`}
        role="status"
        aria-label={label ?? 'Loading'}
      />
      {label && <p className="text-sm text-white/60">{label}</p>}
    </div>
  );
}
