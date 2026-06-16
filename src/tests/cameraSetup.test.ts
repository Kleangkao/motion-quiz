import { describe, expect, it } from 'vitest';
import {
  mirrorForFacing,
  shouldOfferFacingPicker,
  shouldShowCameraSwitchButton,
  toggleFacingMode,
  deviceHasFrontAndBackCameras,
  calibrationForFacing,
} from '@/camera/cameraSetup';

describe('cameraSetup', () => {
  it('mirrors front camera and desktop webcams', () => {
    expect(mirrorForFacing('user')).toBe(true);
    expect(mirrorForFacing('environment')).toBe(true);
  });

  it('detects front and back from device labels', () => {
    expect(
      deviceHasFrontAndBackCameras([
        { deviceId: '1', label: 'Front Camera', facing: 'user' },
        { deviceId: '2', label: 'Back Camera', facing: 'environment' },
      ]),
    ).toBe(true);
  });

  it('does not offer facing picker for a single webcam list', () => {
    expect(
      shouldOfferFacingPicker([{ deviceId: '1', label: 'HD Webcam', facing: 'unknown' }]),
    ).toBe(false);
  });

  it('shows switch button when multiple video inputs exist', () => {
    expect(
      shouldShowCameraSwitchButton([
        { deviceId: '1', label: 'Front', facing: 'user' },
        { deviceId: '2', label: 'Back', facing: 'environment' },
      ]),
    ).toBe(true);
    expect(shouldShowCameraSwitchButton([{ deviceId: '1', label: 'Webcam', facing: 'unknown' }])).toBe(
      false,
    );
  });

  it('toggles facing mode', () => {
    expect(toggleFacingMode('user')).toBe('environment');
    expect(toggleFacingMode('environment')).toBe('user');
  });

  it('syncs calibration mirror with active facing', () => {
    const cal = { bodyCenterX: 0.5, shoulderWidthNorm: 0.3, mirrored: false };
    expect(calibrationForFacing(cal, 'user').mirrored).toBe(true);
    // Desktop / non-mobile: environment still mirrors (webcam)
    expect(calibrationForFacing(cal, 'environment').mirrored).toBe(true);
  });
});
