import type { GestureSelectorOutput } from './types';
import type { Landmark } from './types';

export type ModelStatus = 'idle' | 'loading' | 'ready' | 'failed';
export type CameraStatus = 'idle' | 'requesting' | 'ready' | 'error';

export interface DetectionDiagnostics {
  cameraStatus: CameraStatus;
  poseModelStatus: ModelStatus;
  handModelStatus: ModelStatus;
  inferenceRunning: boolean;
  personDetected: boolean;
  poseLandmarkCount: number;
  handCount: number;
  leftWristVisibility: number | null;
  rightWristVisibility: number | null;
  leftShoulderVisibility: number | null;
  rightShoulderVisibility: number | null;
  bodyCenterX: number | null;
  detectionSource: 'none' | 'pose' | 'hand';
  tooClose: boolean;
  handsOutsideFrame: boolean;
  lastDetectionTimestampMs: number | null;
  cooldownActive: boolean;
  fps: number;
  cameraResolution: string | null;
  gestureOutput: GestureSelectorOutput;
  poseLandmarks: Landmark[] | null;
  handLandmarks: Landmark[][] | null;
  targetZones?: import('./targetZones').TargetZoneSet | null;
}

export function createEmptyDiagnostics(): DetectionDiagnostics {
  return {
    cameraStatus: 'idle',
    poseModelStatus: 'idle',
    handModelStatus: 'idle',
    inferenceRunning: false,
    personDetected: false,
    poseLandmarkCount: 0,
    handCount: 0,
    leftWristVisibility: null,
    rightWristVisibility: null,
    leftShoulderVisibility: null,
    rightShoulderVisibility: null,
    bodyCenterX: null,
    detectionSource: 'none',
    tooClose: false,
    handsOutsideFrame: false,
    lastDetectionTimestampMs: null,
    cooldownActive: false,
    fps: 0,
    cameraResolution: null,
    gestureOutput: { confidence: 0, holdProgress: 0 },
    poseLandmarks: null,
    handLandmarks: null,
  };
}
