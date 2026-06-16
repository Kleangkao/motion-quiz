import { getGestureStatusMessage } from '@/vision/gestureStatusMessages';
import type { GestureSelectorOutput } from '@/vision/types';
import type { DetectionDiagnostics } from '@/vision/detectionTypes';

interface Props {
  gestureOutput: GestureSelectorOutput;
  diagnostics: DetectionDiagnostics;
  gestureInputEnabled: boolean;
  touchFallbackActive: boolean;
}

export function GestureStatus({
  gestureOutput,
  diagnostics,
  gestureInputEnabled,
  touchFallbackActive,
}: Props) {
  const { text, icon } = getGestureStatusMessage(
    gestureOutput,
    diagnostics,
    gestureInputEnabled,
  );

  return (
    <div className="flex flex-col items-center gap-1">
      {touchFallbackActive && (
        <span className="rounded-lg bg-amber-500/30 px-3 py-0.5 text-xs font-bold text-amber-200">
          Touch fallback enabled
        </span>
      )}
      <div className="flex items-center gap-2 rounded-xl bg-black/60 px-4 py-2 text-sm font-semibold text-white backdrop-blur max-w-md text-center">
        <span>{icon}</span>
        <span>{text}</span>
      </div>
    </div>
  );
}
