import type { Landmark, CalibrationProfile } from './types';
import { computeBodyCenterX, computeShoulderWidth } from './landmarkUtils';

const VISIBILITY_MIN = 0.45;

export function buildCalibrationProfile(
  samples: Landmark[][],
  mirrored: boolean,
): CalibrationProfile {
  if (samples.length === 0) {
    return { bodyCenterX: 0.5, shoulderWidthNorm: 0.3, mirrored };
  }

  const centers = samples.map((s) => computeBodyCenterX(s, VISIBILITY_MIN));
  const widths = samples
    .map((s) => computeShoulderWidth(s, VISIBILITY_MIN))
    .filter((w): w is number => w !== undefined);

  const avgCenter = centers.reduce((a, b) => a + b, 0) / centers.length;
  const avgWidth = widths.length > 0
    ? widths.reduce((a, b) => a + b, 0) / widths.length
    : 0.3;

  return {
    bodyCenterX: avgCenter,
    shoulderWidthNorm: avgWidth,
    mirrored,
  };
}

export const DEFAULT_CALIBRATION: CalibrationProfile = {
  bodyCenterX: 0.5,
  shoulderWidthNorm: 0.3,
  mirrored: true,
};
