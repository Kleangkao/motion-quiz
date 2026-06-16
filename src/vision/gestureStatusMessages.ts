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
    return { text: 'Wrong card. Point at the card shown in the instructions.', icon: '↩️' };
  }

  if (output.reason === 'cooldown' || output.lockedSide) {
    return { text: 'Answer locked!', icon: '✅' };
  }

  if (output.candidateSide === 'left') {
    if (output.holdProgress > 0.3) {
      return { text: `Hold on LEFT… ${Math.round(output.holdProgress * 100)}%`, icon: '👈' };
    }
    return { text: 'Point at the LEFT answer card.', icon: '👈' };
  }

  if (output.candidateSide === 'right') {
    if (output.holdProgress > 0.3) {
      return { text: `Hold on RIGHT… ${Math.round(output.holdProgress * 100)}%`, icon: '👉' };
    }
    return { text: 'Point at the RIGHT answer card.', icon: '👉' };
  }

  if (output.reason === 'neutral_zone' || output.reason === 'near_body') {
    return { text: 'Move your hand farther toward an answer.', icon: '🎯' };
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
