import type { TargetSensitivity } from '@/storage/types';

export type DeviceTier = 'mobile' | 'tablet' | 'desktop';

export function getDeviceTier(containerWidth: number, containerHeight: number): DeviceTier {
  const minDim = Math.min(containerWidth, containerHeight);
  if (minDim < 600) return 'mobile';
  if (minDim < 900) return 'tablet';
  return 'desktop';
}

interface MarginRange {
  mobile: [number, number];
  tablet: [number, number];
  desktop: [number, number];
}

const MARGIN_X: Record<TargetSensitivity, MarginRange> = {
  strict: { mobile: [30, 50], tablet: [30, 50], desktop: [30, 50] },
  normal: { mobile: [60, 100], tablet: [90, 140], desktop: [80, 120] },
  easy: { mobile: [60, 100], tablet: [120, 180], desktop: [120, 180] },
};

const MARGIN_Y: Record<TargetSensitivity, MarginRange> = {
  strict: { mobile: [30, 50], tablet: [30, 50], desktop: [30, 50] },
  normal: { mobile: [60, 100], tablet: [80, 120], desktop: [70, 100] },
  easy: { mobile: [60, 100], tablet: [100, 140], desktop: [100, 140] },
};

function pickMargin(range: [number, number]): number {
  return Math.round((range[0] + range[1]) / 2);
}

export function getTargetMargins(
  sensitivity: TargetSensitivity,
  containerWidth: number,
  containerHeight: number,
): { marginX: number; marginY: number } {
  const tier = getDeviceTier(containerWidth, containerHeight);
  return {
    marginX: pickMargin(MARGIN_X[sensitivity][tier]),
    marginY: pickMargin(MARGIN_Y[sensitivity][tier]),
  };
}

export function getTargetHoldMs(sensitivity: TargetSensitivity): number {
  switch (sensitivity) {
    case 'strict':
      return 725;
    case 'easy':
      return 500;
    default:
      return 600;
  }
}

export function getMinArmExtension(sensitivity: TargetSensitivity): number {
  switch (sensitivity) {
    case 'strict':
      return 0.18;
    case 'easy':
      return 0.12;
    default:
      return 0.15;
  }
}

/** Center neutral strip width as fraction of container (16–25%) */
export function getNeutralWidthFraction(containerWidth: number): number {
  if (containerWidth < 600) return 0.25;
  if (containerWidth < 900) return 0.2;
  return 0.18;
}
