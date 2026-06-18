import type { GestureSelectorOutput } from './types';
import type { DetectionDiagnostics } from './detectionTypes';

export interface StatusMessage {
  text: string;
  icon: string;
}

export function getGestureStatusMessage(
  output: GestureSelectorOutput,
  diagnostics: DetectionDiagnostics,
  gestureInputEnabled: boolean,
): StatusMessage {
  if (!gestureInputEnabled) {
    return { text: 'Touch mode. Tap a choice to answer.', icon: '👆' };
  }

  if (diagnostics.poseModelStatus === 'loading' || diagnostics.handModelStatus === 'loading') {
    return { text: 'Loading pose model...', icon: '⏳' };
  }

  if (diagnostics.poseModelStatus === 'failed') {
    return {
      text: 'Pose model failed to load. Check connection or enable debug-touch in Settings.',
      icon: '⚠️',
    };
  }

  if (diagnostics.cameraStatus !== 'ready') {
    return { text: 'Waiting for camera...', icon: '📷' };
  }

  if (output.reason === 'wrong_side') {
    return { text: 'Wrong card — point at the side shown in the instructions.', icon: '↩️' };
  }

  if (output.reason === 'cooldown' || output.lockedSide) {
    return { text: 'Answer locked!', icon: '✅' };
  }

  if (output.candidateSide === 'left') {
    if (output.reason === 'grace' || output.holdProgress > 0.3) {
      return {
        text: `Hold on LEFT… ${Math.round(output.holdProgress * 100)}%`,
        icon: '👈',
      };
    }
    return { text: 'Point at the LEFT answer card.', icon: '👈' };
  }

  if (output.candidateSide === 'right') {
    if (output.reason === 'grace' || output.holdProgress > 0.3) {
      return {
        text: `Hold on RIGHT… ${Math.round(output.holdProgress * 100)}%`,
        icon: '👉',
      };
    }
    return { text: 'Point at the RIGHT answer card.', icon: '👉' };
  }

  if (output.reason === 'neutral_zone') {
    return { text: 'Move farther left or right — center does not count.', icon: '🎯' };
  }

  if (output.reason === 'ambiguous') {
    return { text: 'Point more clearly at one answer card.', icon: '🎯' };
  }

  if (output.reason === 'near_body') {
    return { text: 'Extend your arm farther toward the answer.', icon: '🎯' };
  }

  if (diagnostics.personDetected) {
    if (diagnostics.tooClose) {
      return { text: 'Too close to the camera. Step back.', icon: '🔙' };
    }
    if (diagnostics.handsOutsideFrame) {
      return { text: 'Show your hand in the camera or step back.', icon: '🤚' };
    }
    return { text: 'Point at one of the answer cards.', icon: '🤚' };
  }

  if (output.reason === 'no_landmarks' || output.reason === 'no_candidate') {
    return { text: 'Show your hand in the camera or step back.', icon: '📷' };
  }

  return { text: 'Point at one of the answer cards.', icon: '🤚' };
}

/** Debug-only detail for rejection reasons (not shown in normal gameplay). */
export function getGestureRejectionDebugDetail(output: GestureSelectorOutput): string | null {
  if (!output.reason) return null;
  if (output.reason === 'holding' || output.reason === 'locked' || output.reason === 'grace') {
    return null;
  }
  const parts = [output.reason];
  if (output.debug?.pointingAt) parts.push(`pointing=${String(output.debug.pointingAt)}`);
  if (output.debug?.source) parts.push(`source=${String(output.debug.source)}`);
  if (output.debug?.graceMissCount !== undefined) {
    parts.push(`graceMiss=${String(output.debug.graceMissCount)}`);
  }
  return parts.join(' · ');
}
