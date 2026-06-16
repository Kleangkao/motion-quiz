import type { PlayMode } from '@/storage/types';
import type { CalibrationProfile } from '@/vision/types';

export interface PlaySessionState {
  calibration?: CalibrationProfile;
  playMode?: PlayMode;
  challengeId?: string;
  challengeName?: string;
}

export function mergePlayState(
  locationState: unknown,
  patch: Partial<PlaySessionState> = {},
): PlaySessionState {
  const base = (locationState ?? {}) as PlaySessionState;
  return { ...base, ...patch };
}
