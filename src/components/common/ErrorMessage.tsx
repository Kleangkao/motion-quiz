interface Props {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorMessage({ title = 'Something went wrong', message, onRetry }: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="text-5xl">⚠️</div>
      <h2 className="text-xl font-bold text-white">{title}</h2>
      <p className="max-w-sm text-white/70">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn btn-primary btn-md mt-2">
          Try Again
        </button>
      )}
    </div>
  );
}
