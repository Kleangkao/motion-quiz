import type { Landmark } from './types';
import { PoseLandmarkIndex } from './types';

/** Mirror a normalized x coordinate: mirrored x = 1 - x */
export function mirrorX(x: number): number {
  return 1 - x;
}

/**
 * Convert a normalized landmark to display-space pixels.
 * If mirrored=true, apply horizontal flip.
 */
export function toDisplaySpace(
  landmark: Landmark,
  displayWidth: number,
  displayHeight: number,
  mirrored: boolean,
): { x: number; y: number } {
  const { x, y } = landmarkToContainerNorm(landmark, {
    videoWidth: 0,
    videoHeight: 0,
    displayWidth,
    displayHeight,
    mirrored,
  });
  return { x: x * displayWidth, y: y * displayHeight };
}

/**
 * Map MediaPipe landmark (0–1 on raw video frame) to container-normalized coords
 * matching CSS object-fit: cover on the game container.
 */
export function landmarkToContainerNorm(
  landmark: Landmark,
  layout: {
    videoWidth: number;
    videoHeight: number;
    displayWidth: number;
    displayHeight: number;
    mirrored: boolean;
  },
): { x: number; y: number } {
  const { videoWidth, videoHeight, displayWidth, displayHeight, mirrored } = layout;

  if (
    videoWidth <= 0 ||
    videoHeight <= 0 ||
    displayWidth <= 0 ||
    displayHeight <= 0
  ) {
    return { x: mirrored ? mirrorX(landmark.x) : landmark.x, y: landmark.y };
  }

  const scale = Math.max(displayWidth / videoWidth, displayHeight / videoHeight);
  const displayedW = videoWidth * scale;
  const displayedH = videoHeight * scale;
  const offsetX = (displayWidth - displayedW) / 2;
  const offsetY = (displayHeight - displayedH) / 2;

  const videoX = mirrored ? mirrorX(landmark.x) : landmark.x;
  const pixelX = videoX * displayedW + offsetX;
  const pixelY = landmark.y * displayedH + offsetY;

  return {
    x: pixelX / displayWidth,
    y: pixelY / displayHeight,
  };
}

export function isVisible(landmark: Landmark | undefined, threshold: number): boolean {
  if (!landmark) return false;
  return (landmark.visibility ?? 1) >= threshold;
}

export function midpointX(a: Landmark, b: Landmark): number {
  return (a.x + b.x) / 2;
}

export function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * Compute body center X (normalized, pre-mirror) from pose landmarks.
 * Falls back to hips, then 0.5.
 */
export function computeBodyCenterX(
  landmarks: Landmark[],
  visibilityMin: number,
): number {
  const ls = landmarks[PoseLandmarkIndex.LEFT_SHOULDER];
  const rs = landmarks[PoseLandmarkIndex.RIGHT_SHOULDER];
  if (isVisible(ls, visibilityMin) && isVisible(rs, visibilityMin)) {
    return midpointX(ls, rs);
  }
  const lh = landmarks[PoseLandmarkIndex.LEFT_HIP];
  const rh = landmarks[PoseLandmarkIndex.RIGHT_HIP];
  if (isVisible(lh, visibilityMin) && isVisible(rh, visibilityMin)) {
    return midpointX(lh, rh);
  }
  return 0.5;
}

/** Estimate shoulder width in normalized units. */
export function computeShoulderWidth(
  landmarks: Landmark[],
  visibilityMin: number,
): number | undefined {
  const ls = landmarks[PoseLandmarkIndex.LEFT_SHOULDER];
  const rs = landmarks[PoseLandmarkIndex.RIGHT_SHOULDER];
  if (isVisible(ls, visibilityMin) && isVisible(rs, visibilityMin)) {
    return Math.abs(ls.x - rs.x);
  }
  return undefined;
}
