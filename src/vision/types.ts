export type { ChoiceZones, NormalizedRect } from './choiceZones';
export type { TargetZoneSet, TargetRect, SideTargets } from './targetZones';

export interface Landmark {
  x: number; // normalized 0-1
  y: number;
  z?: number;
  visibility?: number;
}

/** MediaPipe Pose landmark indices we use */
export const PoseLandmarkIndex = {
  NOSE: 0,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
} as const;

export interface CalibrationProfile {
  /** Normalized x of body center (midpoint of shoulders) */
  bodyCenterX: number;
  /** Normalized shoulder width */
  shoulderWidthNorm: number;
  /** Whether the camera is mirrored */
  mirrored: boolean;
}

export interface GestureSettings {
  /** Minimum visibility to consider a pose landmark reliable */
  poseVisibilityMin: number;
  /** Width of the neutral dead zone around body center (as fraction of display width) */
  neutralZonePercent: number;
  /** Maximum x position (0-1) for left zone */
  leftZoneMaxPercent: number;
  /** Minimum x position (0-1) for right zone */
  rightZoneMinPercent: number;
  /** How long candidate must be held before locking (ms) */
  minHoldMs: number;
  /** How long to wait after an answer before accepting another (ms) */
  cooldownMs: number;
  /** Minimum horizontal distance (fraction of display width) from body center for arm extension */
  minArmExtensionPercent: number;
}

export const PRESET_THRESHOLDS: Record<string, GestureSettings> = {
  low: {
    poseVisibilityMin: 0.35,
    neutralZonePercent: 0.12,
    leftZoneMaxPercent: 0.45,
    rightZoneMinPercent: 0.55,
    minHoldMs: 700,
    cooldownMs: 1200,
    minArmExtensionPercent: 0.12,
  },
  normal: {
    poseVisibilityMin: 0.45,
    neutralZonePercent: 0.18,
    leftZoneMaxPercent: 0.40,
    rightZoneMinPercent: 0.60,
    minHoldMs: 550,
    cooldownMs: 1000,
    minArmExtensionPercent: 0.15,
  },
  high: {
    poseVisibilityMin: 0.55,
    neutralZonePercent: 0.22,
    leftZoneMaxPercent: 0.38,
    rightZoneMinPercent: 0.62,
    minHoldMs: 400,
    cooldownMs: 800,
    minArmExtensionPercent: 0.18,
  },
};

export interface GestureSelectorInput {
  poseLandmarks?: Landmark[];
  /** Each entry is 21 hand landmarks from MediaPipe Hand Landmarker */
  handLandmarks?: Landmark[][];
  timestampMs: number;
  displayWidth: number;
  displayHeight: number;
  /** Raw camera frame size — required for object-fit: cover coordinate mapping */
  videoWidth: number;
  videoHeight: number;
  mirrored: boolean;
  calibration: CalibrationProfile;
  settings: GestureSettings;
  /** Card-centered / strict / wide target zones from measured UI */
  targetZones?: import('./targetZones').TargetZoneSet;
  /** When set, only this side can become a candidate (gesture test steps) */
  requiredSide?: 'left' | 'right';
  /** When false, pose wrists cannot start a new hold (hand landmarker enabled). */
  allowPoseHoldStart?: boolean;
}

export interface GestureSelectorOutput {
  candidateSide?: 'left' | 'right';
  lockedSide?: 'left' | 'right';
  /** Increments on each lock; persists until resetGesture */
  lockEventId?: number;
  confidence: number;
  holdProgress: number;
  reason?: string;
  debug?: Record<string, unknown>;
}

export interface GestureSelectorState {
  candidateSide?: 'left' | 'right';
  candidateStartMs?: number;
  lockedSide?: 'left' | 'right';
  lockedAtMs?: number;
  cooldownUntilMs?: number;
  /** Sticky lock — survives past the lock frame until resetGesture */
  pendingLock?: {
    side: 'left' | 'right';
    eventId: number;
    source?: 'pose' | 'hand';
  };
  lastLockEventId?: number;
  /** Accumulated ms with a valid same-side candidate (misses/grace do not add). */
  validHoldMs?: number;
  lastHoldTickMs?: number;
  /** True once a hand candidate has started the current hold attempt. */
  holdInitiatedByHand?: boolean;
  graceMissCount?: number;
  graceMissStartMs?: number;
}
