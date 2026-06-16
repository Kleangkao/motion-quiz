export type CameraState =
  | { status: 'idle' }
  | { status: 'requesting' }
  | { status: 'active'; stream: MediaStream; deviceId: string }
  | { status: 'error'; error: CameraError };

export type CameraErrorCode =
  | 'PERMISSION_DENIED'
  | 'NO_CAMERA'
  | 'IN_USE'
  | 'NOT_SUPPORTED'
  | 'INSECURE_CONTEXT'
  | 'UNKNOWN';

export interface CameraError {
  code: CameraErrorCode;
  message: string;
}

export interface VideoDevice {
  deviceId: string;
  label: string;
  facing?: 'user' | 'environment' | 'unknown';
}

export type ResolutionPreset = 'performance' | 'balanced' | 'quality';

export const RESOLUTION_CONSTRAINTS: Record<ResolutionPreset, MediaTrackConstraints> = {
  performance: { width: { ideal: 640 }, height: { ideal: 480 } },
  balanced: { width: { ideal: 1280 }, height: { ideal: 720 } },
  quality: { width: { ideal: 1920 }, height: { ideal: 1080 } },
};
