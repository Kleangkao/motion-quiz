import type { VideoDevice } from './cameraTypes';
import type { CalibrationProfile } from '@/vision/types';

export type CameraFacingMode = 'user' | 'environment';

/** Phone/tablet with front + back cameras; desktop webcams are treated differently. */
export function isMobileCameraDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

/** Front/selfie and desktop webcams are mirrored; mobile back camera is not. */
export function mirrorForFacing(facing: CameraFacingMode): boolean {
  if (facing === 'environment' && isMobileCameraDevice()) return false;
  return true;
}

/** Keep pose calibration but sync mirror flag with the active camera facing. */
export function calibrationForFacing(
  calibration: CalibrationProfile,
  facing: CameraFacingMode,
): CalibrationProfile {
  const mirrored = mirrorForFacing(facing);
  return calibration.mirrored === mirrored ? calibration : { ...calibration, mirrored };
}

export function deviceHasFrontAndBackCameras(devices: VideoDevice[]): boolean {
  const hasFront = devices.some((d) => d.facing === 'user');
  const hasBack = devices.some((d) => d.facing === 'environment');
  if (hasFront && hasBack) return true;
  return devices.length >= 2;
}

/** Offer front/back only on mobile when the device likely has both cameras. */
export function shouldOfferFacingPicker(devices: VideoDevice[]): boolean {
  if (!isMobileCameraDevice()) return false;
  if (devices.length === 0) return true;
  return deviceHasFrontAndBackCameras(devices);
}

/** True after permission when multiple video inputs exist (post-enumerate). */
export function shouldShowCameraSwitchButton(devices: VideoDevice[]): boolean {
  return devices.length >= 2;
}

export function toggleFacingMode(facing: CameraFacingMode): CameraFacingMode {
  return facing === 'user' ? 'environment' : 'user';
}

export function cameraLabelForSettings(
  facing: CameraFacingMode,
  devices: VideoDevice[],
): string {
  if (shouldOfferFacingPicker(devices)) {
    return facing === 'user' ? 'Front camera' : 'Back camera';
  }
  return 'Webcam';
}
