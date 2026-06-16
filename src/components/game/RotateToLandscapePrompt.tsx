export function RotateToLandscapePrompt() {
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/75 px-6 backdrop-blur-sm">
      <div className="glass-card max-w-sm space-y-3 p-6 text-center">
        <p className="text-4xl" aria-hidden="true">
          📱↔️
        </p>
        <p className="text-lg font-bold text-white">Rotate to landscape</p>
      </div>
    </div>
  );
}
