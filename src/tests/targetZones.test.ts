import { describe, it, expect } from 'vitest';
import {
  buildTargetZones,
  classifyPointInTargets,
  normalizedToTargetRect,
  sideFromTargets,
  HIT_INWARD_TOLERANCE,
} from '@/vision/targetZones';
import {
  runGestureSelector,
  resetGestureState,
  applyMirror,
} from '@/vision/gestureSelector';
import { PRESET_THRESHOLDS } from '@/vision/types';
import { getTargetHoldMs, getTargetMargins } from '@/vision/targetSensitivity';

const CONTAINER_W = 1000;
const CONTAINER_H = 800;

const LEFT_CARD = normalizedToTargetRect({
  xMin: 0.08,
  xMax: 0.32,
  yMin: 0.44,
  yMax: 0.62,
});

const RIGHT_CARD = normalizedToTargetRect({
  xMin: 0.68,
  xMax: 0.92,
  yMin: 0.44,
  yMax: 0.62,
});

function zones(mode: 'card-centered-target' | 'strict-card-target' | 'wide-zone-debug', sens: 'strict' | 'normal' | 'easy' = 'normal') {
  return buildTargetZones(
    { xMin: LEFT_CARD.xMin, xMax: LEFT_CARD.xMax, yMin: LEFT_CARD.yMin, yMax: LEFT_CARD.yMax },
    { xMin: RIGHT_CARD.xMin, xMax: RIGHT_CARD.xMax, yMin: RIGHT_CARD.yMin, yMax: RIGHT_CARD.yMax },
    CONTAINER_W,
    CONTAINER_H,
    mode,
    sens,
  )!;
}

const DEFAULT_LAYOUT = {
  videoWidth: 1000,
  videoHeight: 800,
  displayWidth: CONTAINER_W,
  displayHeight: CONTAINER_H,
  mirrored: false,
};

const BASE_SETTINGS = {
  ...PRESET_THRESHOLDS.normal,
  minHoldMs: getTargetHoldMs('normal'),
  minArmExtensionPercent: 0.15,
};

function makeHand(indexTipX: number, indexTipY = 0.53, mirrored = false): import('@/vision/types').Landmark[] {
  const hand = Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.5 }));
  if (mirrored) {
    hand[8] = { x: 1 - indexTipX, y: indexTipY };
    hand[0] = { x: 1 - indexTipX - 0.06, y: indexTipY + 0.05 };
  } else {
    hand[8] = { x: indexTipX, y: indexTipY };
    hand[0] = { x: indexTipX + 0.06, y: indexTipY + 0.05 };
  }
  return hand;
}

describe('buildTargetZones', () => {
  it('card-centered expands left/right hit zones with normal sensitivity', () => {
    const z = zones('card-centered-target', 'normal');
    expect(z.left.hit.width).toBeGreaterThan(z.left.card.width);
    expect(z.left.hit.xMax).toBeLessThanOrEqual(0.42);
    expect(z.right.hit.xMin).toBeGreaterThanOrEqual(0.58);
  });

  it('strict mode uses card rect as hit zone', () => {
    const z = zones('strict-card-target');
    expect(z.left.hit.xMin).toBeCloseTo(z.left.card.xMin);
    expect(z.left.hit.xMax).toBeCloseTo(z.left.card.xMax);
  });

  it('easy expands more than strict but stays out of center', () => {
    const easy = zones('card-centered-target', 'easy');
    const strict = zones('card-centered-target', 'strict');
    expect(easy.left.hit.width).toBeGreaterThan(strict.left.hit.width);
    expect(easy.left.hit.xMax).toBeLessThanOrEqual(0.42);
    expect(easy.right.hit.xMin).toBeGreaterThanOrEqual(0.58);
  });

  it('neutral zone blocks center answers', () => {
    const z = zones('card-centered-target');
    expect(classifyPointInTargets(0.5, 0.53, z)).toBe('neutral');
  });

  it('left hit inward edge is bounded by card.xMax + inward tolerance', () => {
    const z = zones('card-centered-target', 'normal');
    expect(z.left.hit.xMax).toBeCloseTo(
      Math.min(0.42, LEFT_CARD.xMax + HIT_INWARD_TOLERANCE),
    );
  });

  it('right hit inward edge is bounded by card.xMin - inward tolerance', () => {
    const z = zones('card-centered-target', 'normal');
    expect(z.right.hit.xMin).toBeCloseTo(
      Math.max(0.58, RIGHT_CARD.xMin - HIT_INWARD_TOLERANCE),
    );
  });
});

describe('card-centered inward hit tolerance', () => {
  const cardY = 0.53;

  it('left gap point beyond card.xMax + tolerance does not count', () => {
    const z = zones('card-centered-target', 'normal');
    const beyond = z.left.card.xMax + HIT_INWARD_TOLERANCE + 0.03;
    expect(classifyPointInTargets(beyond, cardY, z)).not.toBe('left');
  });

  it('right gap point before card.xMin - tolerance does not count', () => {
    const z = zones('card-centered-target', 'normal');
    const beyond = z.right.card.xMin - HIT_INWARD_TOLERANCE - 0.03;
    expect(classifyPointInTargets(beyond, cardY, z)).not.toBe('right');
  });

  it('point within inward tolerance still counts for left', () => {
    const z = zones('card-centered-target', 'normal');
    const inside = z.left.card.xMax + HIT_INWARD_TOLERANCE * 0.5;
    expect(sideFromTargets(inside, cardY, z)).toBe('left');
  });

  it('point within inward tolerance still counts for right', () => {
    const z = zones('card-centered-target', 'normal');
    const inside = z.right.card.xMin - HIT_INWARD_TOLERANCE * 0.5;
    expect(sideFromTargets(inside, cardY, z)).toBe('right');
  });

  it('point outward of left card still counts', () => {
    const z = zones('card-centered-target', 'normal');
    const outward = Math.max(0.01, z.left.hit.xMin + 0.02);
    expect(outward).toBeLessThan(z.left.card.xMin);
    expect(sideFromTargets(outward, cardY, z)).toBe('left');
  });

  it('point outward of right card still counts', () => {
    const z = zones('card-centered-target', 'normal');
    const outward = Math.min(0.99, z.right.hit.xMax - 0.02);
    expect(outward).toBeGreaterThan(z.right.card.xMax);
    expect(sideFromTargets(outward, cardY, z)).toBe('right');
  });

  it('center neutral unchanged on mobile width', () => {
    const z = buildTargetZones(
      { xMin: LEFT_CARD.xMin, xMax: LEFT_CARD.xMax, yMin: LEFT_CARD.yMin, yMax: LEFT_CARD.yMax },
      { xMin: RIGHT_CARD.xMin, xMax: RIGHT_CARD.xMax, yMin: RIGHT_CARD.yMin, yMax: RIGHT_CARD.yMax },
      500,
      400,
      'card-centered-target',
      'normal',
    )!;
    expect(z.neutral.xMin).toBeCloseTo(0.375);
    expect(z.neutral.xMax).toBeCloseTo(0.625);
    expect(classifyPointInTargets(0.5, cardY, z)).toBe('neutral');
  });
});

describe('sideFromTargets — card-centered', () => {
  it('detects left inside expanded left target', () => {
    const z = zones('card-centered-target', 'normal');
    const cx = (z.left.hit.xMin + z.left.hit.xMax) / 2;
    expect(sideFromTargets(cx, 0.53, z)).toBe('left');
  });

  it('detects right inside expanded right target', () => {
    const z = zones('card-centered-target', 'normal');
    const cx = (z.right.hit.xMin + z.right.hit.xMax) / 2;
    expect(sideFromTargets(cx, 0.53, z)).toBe('right');
  });

  it('center neutral does not answer', () => {
    const z = zones('card-centered-target');
    expect(sideFromTargets(0.5, 0.53, z)).toBeNull();
  });

  it('left side outside expanded target does not answer', () => {
    const z = zones('card-centered-target', 'strict');
    expect(sideFromTargets(0.02, 0.53, z)).toBeNull();
  });

  it('right side outside expanded target does not answer', () => {
    const z = zones('card-centered-target', 'strict');
    expect(sideFromTargets(0.98, 0.53, z)).toBeNull();
  });
});

describe('runGestureSelector with target zones', () => {
  it('starts hold when fingertip is in expanded left target', () => {
    const z = zones('card-centered-target', 'normal');
    const cx = (z.left.hit.xMin + z.left.hit.xMax) / 2;
    const { output } = runGestureSelector(
      {
        ...DEFAULT_LAYOUT,
        handLandmarks: [makeHand(cx, 0.53)],
        timestampMs: 100,
        calibration: { bodyCenterX: 0.5, shoulderWidthNorm: 0.3, mirrored: false },
        settings: BASE_SETTINGS,
        targetZones: z,
      },
      resetGestureState(),
    );
    expect(output.candidateSide).toBe('left');
  });

  it('strict requires exact card rect', () => {
    const z = zones('strict-card-target');
    const outsideCard = z.left.card.xMin - 0.02;
    const { output } = runGestureSelector(
      {
        ...DEFAULT_LAYOUT,
        handLandmarks: [makeHand(outsideCard, 0.53)],
        timestampMs: 100,
        calibration: { bodyCenterX: 0.5, shoulderWidthNorm: 0.3, mirrored: false },
        settings: BASE_SETTINGS,
        targetZones: z,
      },
      resetGestureState(),
    );
    expect(output.candidateSide).toBeUndefined();
  });

  it('hold duration required before lock', () => {
    const z = zones('card-centered-target');
    const cx = (z.left.hit.xMin + z.left.hit.xMax) / 2;
    const input = {
      ...DEFAULT_LAYOUT,
      handLandmarks: [makeHand(cx, 0.53)],
      calibration: { bodyCenterX: 0.5, shoulderWidthNorm: 0.3, mirrored: false },
      settings: { ...BASE_SETTINGS, minHoldMs: 600 },
      targetZones: z,
    };
    const { nextState: s1 } = runGestureSelector({ ...input, timestampMs: 0 }, resetGestureState());
    const { output: early } = runGestureSelector({ ...input, timestampMs: 200 }, s1);
    expect(early.lockedSide).toBeUndefined();
    expect(early.holdProgress).toBeGreaterThan(0);
    expect(early.holdProgress).toBeLessThan(1);

    const { output: locked } = runGestureSelector({ ...input, timestampMs: 650 }, s1);
    expect(locked.lockedSide).toBe('left');
  });

  it('cooldown prevents duplicate lock after reset', () => {
    const z = zones('card-centered-target');
    const cx = (z.left.hit.xMin + z.left.hit.xMax) / 2;
    const input = {
      ...DEFAULT_LAYOUT,
      handLandmarks: [makeHand(cx, 0.53)],
      calibration: { bodyCenterX: 0.5, shoulderWidthNorm: 0.3, mirrored: false },
      settings: BASE_SETTINGS,
      targetZones: z,
    };
    const { nextState: s1 } = runGestureSelector({ ...input, timestampMs: 0 }, resetGestureState());
    const { nextState: s2 } = runGestureSelector({ ...input, timestampMs: 700 }, s1);
    const afterSubmit = { ...resetGestureState(), cooldownUntilMs: s2.cooldownUntilMs };
    const { output } = runGestureSelector({ ...input, timestampMs: 750 }, afterSubmit);
    expect(output.reason).toBe('cooldown');
  });

  it('mirrored preview maps to visual left target', () => {
    const z = zones('card-centered-target');
    const cx = (z.left.hit.xMin + z.left.hit.xMax) / 2;
    const { output } = runGestureSelector(
      {
        ...DEFAULT_LAYOUT,
        mirrored: true,
        handLandmarks: [makeHand(cx, 0.53, true)],
        timestampMs: 100,
        calibration: { bodyCenterX: 0.5, shoulderWidthNorm: 0.3, mirrored: true },
        settings: BASE_SETTINGS,
        targetZones: z,
      },
      resetGestureState(),
    );
    expect(output.candidateSide).toBe('left');
  });
});

describe('target margins by sensitivity', () => {
  it('normal margins are within spec range on desktop', () => {
    const m = getTargetMargins('normal', 1200, 900);
    expect(m.marginX).toBeGreaterThanOrEqual(80);
    expect(m.marginX).toBeLessThanOrEqual(120);
  });
});

describe('mirrored coordinate mapping', () => {
  it('applyMirror flips raw x', () => {
    expect(applyMirror(0.85, true)).toBeCloseTo(0.15);
  });
});
