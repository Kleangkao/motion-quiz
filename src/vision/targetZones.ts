import type { SelectionMode, TargetSensitivity } from '@/storage/types';
import type { NormalizedRect } from './choiceZones';
import { getNeutralWidthFraction, getTargetMargins } from './targetSensitivity';

export interface TargetRect {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

export interface SideTargets {
  card: TargetRect;
  hit: TargetRect;
}

export interface TargetZoneSet {
  left: SideTargets;
  right: SideTargets;
  neutral: TargetRect;
  selectionMode: SelectionMode;
}

export type ZoneHitResult = 'left' | 'right' | 'neutral' | 'none' | 'ambiguous';

export function normalizedToTargetRect(r: NormalizedRect): TargetRect {
  const width = r.xMax - r.xMin;
  const height = r.yMax - r.yMin;
  return {
    ...r,
    width,
    height,
    centerX: (r.xMin + r.xMax) / 2,
    centerY: (r.yMin + r.yMax) / 2,
  };
}

export function pointInTargetRect(x: number, y: number, rect: TargetRect): boolean {
  return x >= rect.xMin && x <= rect.xMax && y >= rect.yMin && y <= rect.yMax;
}

export function expandTargetRect(
  card: TargetRect,
  marginXNorm: number,
  marginYNorm: number,
  clamp?: { maxX?: number; minX?: number },
): TargetRect {
  let xMin = card.xMin - marginXNorm;
  let xMax = card.xMax + marginXNorm;
  let yMin = card.yMin - marginYNorm;
  let yMax = card.yMax + marginYNorm;

  if (clamp?.maxX !== undefined) xMax = Math.min(xMax, clamp.maxX);
  if (clamp?.minX !== undefined) xMin = Math.max(xMin, clamp.minX);

  return normalizedToTargetRect({
    xMin: Math.max(0, xMin),
    xMax: Math.min(1, xMax),
    yMin: Math.max(0, yMin),
    yMax: Math.min(1, yMax),
  });
}

export function buildNeutralZone(containerWidth: number): TargetRect {
  const widthFrac = getNeutralWidthFraction(containerWidth);
  const half = widthFrac / 2;
  return normalizedToTargetRect({
    xMin: 0.5 - half,
    xMax: 0.5 + half,
    yMin: 0,
    yMax: 1,
  });
}

/** Debug-only full-width side zones (legacy 45% / 45% with center gap) */
export function buildWideZoneTargets(_containerWidth = 1000): TargetZoneSet {
  const neutral = normalizedToTargetRect({
    xMin: 0.45,
    xMax: 0.55,
    yMin: 0,
    yMax: 1,
  });
  const leftHit = normalizedToTargetRect({ xMin: 0, xMax: 0.45, yMin: 0, yMax: 1 });
  const rightHit = normalizedToTargetRect({ xMin: 0.55, xMax: 1, yMin: 0, yMax: 1 });

  return {
    left: { card: leftHit, hit: leftHit },
    right: { card: rightHit, hit: rightHit },
    neutral,
    selectionMode: 'wide-zone-debug',
  };
}

export function buildTargetZones(
  leftCard: NormalizedRect | null,
  rightCard: NormalizedRect | null,
  containerWidth: number,
  containerHeight: number,
  selectionMode: SelectionMode,
  targetSensitivity: TargetSensitivity,
): TargetZoneSet | null {
  if (selectionMode === 'wide-zone-debug') {
    return buildWideZoneTargets(containerWidth);
  }

  if (!leftCard || !rightCard || containerWidth <= 0 || containerHeight <= 0) {
    return null;
  }

  const left = normalizedToTargetRect(leftCard);
  const right = normalizedToTargetRect(rightCard);
  const neutral = buildNeutralZone(containerWidth);

  if (selectionMode === 'strict-card-target') {
    return {
      left: { card: left, hit: left },
      right: { card: right, hit: right },
      neutral,
      selectionMode,
    };
  }

  const { marginX, marginY } = getTargetMargins(
    targetSensitivity,
    containerWidth,
    containerHeight,
  );
  const marginXNorm = marginX / containerWidth;
  const marginYNorm = marginY / containerHeight;

  const leftHit = expandTargetRect(left, marginXNorm, marginYNorm, { maxX: 0.42 });
  const rightHit = expandTargetRect(right, marginXNorm, marginYNorm, { minX: 0.58 });

  return {
    left: { card: left, hit: leftHit },
    right: { card: right, hit: rightHit },
    neutral,
    selectionMode: 'card-centered-target',
  };
}

export function classifyPointInTargets(
  x: number,
  y: number,
  zones: TargetZoneSet,
): ZoneHitResult {
  if (pointInTargetRect(x, y, zones.neutral)) return 'neutral';
  const inLeft = pointInTargetRect(x, y, zones.left.hit);
  const inRight = pointInTargetRect(x, y, zones.right.hit);
  if (inLeft && inRight) return 'ambiguous';
  if (inLeft) return 'left';
  if (inRight) return 'right';
  return 'none';
}

export function sideFromTargets(
  x: number,
  y: number,
  zones: TargetZoneSet,
): 'left' | 'right' | null {
  const hit = classifyPointInTargets(x, y, zones);
  if (hit === 'left') return 'left';
  if (hit === 'right') return 'right';
  return null;
}
