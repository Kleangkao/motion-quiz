import type { GestureSelectorOutput, GestureSelectorState } from './types';
import { outputFromPendingLock } from './gestureSelector';

/** Keep hold UI stable when inference is skipped (busy); does not affect submission. */
export function resolveGestureDisplayOutput(
  canInfer: boolean,
  freshOutput: GestureSelectorOutput,
  state: GestureSelectorState,
  lastOutput: GestureSelectorOutput,
  minHoldMs: number,
): GestureSelectorOutput {
  if (canInfer) return freshOutput;

  if (state.pendingLock) {
    return outputFromPendingLock(state);
  }

  if (state.candidateSide !== undefined) {
    const holdProgress = Math.min(1, (state.validHoldMs ?? 0) / minHoldMs);
    return {
      ...lastOutput,
      candidateSide: state.candidateSide,
      holdProgress,
      reason: state.graceMissCount ? 'grace' : lastOutput.reason ?? 'holding',
    };
  }

  if (lastOutput.candidateSide || lastOutput.lockedSide) {
    return lastOutput;
  }

  return { confidence: 0, holdProgress: 0 };
}
