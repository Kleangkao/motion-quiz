import { describe, it, expect } from 'vitest';
import {
  runGestureSelector,
  resetGestureState,
  HOLD_GRACE_MAX_MS,
  HOLD_GRACE_MAX_CONSECUTIVE_MISSES,
} from '@/vision/gestureSelector';
import { buildWideZoneTargets, buildTargetZones, normalizedToTargetRect } from '@/vision/targetZones';
import { PRESET_THRESHOLDS } from '@/vision/types';
import type { GestureSelectorInput, Landmark } from '@/vision/types';
import { getTargetHoldMs } from '@/vision/targetSensitivity';
import { resolveGestureDisplayOutput } from '@/vision/gestureDisplay';

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

function zones(sens: 'strict' | 'normal' | 'easy' = 'normal') {
  return buildTargetZones(
    { xMin: LEFT_CARD.xMin, xMax: LEFT_CARD.xMax, yMin: LEFT_CARD.yMin, yMax: LEFT_CARD.yMax },
    { xMin: RIGHT_CARD.xMin, xMax: RIGHT_CARD.xMax, yMin: RIGHT_CARD.yMin, yMax: RIGHT_CARD.yMax },
    CONTAINER_W,
    CONTAINER_H,
    'card-centered-target',
    sens,
  )!;
}

const BASE_SETTINGS = {
  ...PRESET_THRESHOLDS.normal,
  minHoldMs: getTargetHoldMs('normal'),
  minArmExtensionPercent: 0.15,
};

const DEFAULT_LAYOUT = {
  videoWidth: 1000,
  videoHeight: 800,
  displayWidth: CONTAINER_W,
  displayHeight: CONTAINER_H,
  mirrored: false,
};

function makeHand(indexTipX: number, indexTipY = 0.53, side: 'left' | 'right' = 'left'): Landmark[] {
  const hand = Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.5 }));
  const wristX = side === 'left' ? indexTipX + 0.06 : indexTipX - 0.06;
  hand[8] = { x: indexTipX, y: indexTipY };
  hand[0] = { x: wristX, y: indexTipY + 0.05 };
  hand[12] = { x: indexTipX + (side === 'left' ? 0.02 : -0.02), y: indexTipY };
  hand[16] = { x: indexTipX + (side === 'left' ? 0.03 : -0.03), y: indexTipY };
  return hand;
}

function makePose(leftWristX: number, rightWristX = 0.9): Landmark[] {
  const lms: Landmark[] = Array.from({ length: 33 }, () => ({
    x: 0.5,
    y: 0.5,
    z: 0,
    visibility: 0.9,
  }));
  lms[11] = { x: 0.45, y: 0.3, visibility: 0.9 };
  lms[12] = { x: 0.55, y: 0.3, visibility: 0.9 };
  lms[15] = { x: leftWristX, y: 0.53, visibility: 0.9 };
  lms[16] = { x: rightWristX, y: 0.53, visibility: 0.9 };
  return lms;
}

function leftHandInput(timestampMs: number, extra: Partial<GestureSelectorInput> = {}) {
  const z = zones();
  const cx = (z.left.hit.xMin + z.left.hit.xMax) / 2;
  return {
    ...DEFAULT_LAYOUT,
    handLandmarks: [makeHand(cx, 0.53)],
    timestampMs,
    calibration: { bodyCenterX: 0.5, shoulderWidthNorm: 0.3, mirrored: false },
    settings: BASE_SETTINGS,
    targetZones: z,
    allowPoseHoldStart: false,
    ...extra,
  };
}

describe('gesture reliability v1 — baseline documentation', () => {
  it('hand landmarks that fail rules block pose fallback when hold has not started', () => {
    const z = zones();
    const cx = (z.left.hit.xMin + z.left.hit.xMax) / 2;
    const { output } = runGestureSelector(
      {
        ...DEFAULT_LAYOUT,
        handLandmarks: [makeHand(0.5, 0.53)],
        poseLandmarks: makePose(cx),
        timestampMs: 100,
        calibration: { bodyCenterX: 0.5, shoulderWidthNorm: 0.3, mirrored: false },
        settings: BASE_SETTINGS,
        targetZones: z,
        allowPoseHoldStart: false,
      },
      resetGestureState(),
    );
    expect(output.candidateSide).toBeUndefined();
    expect(output.reason).toBe('neutral_zone');
  });

  it('pose-only can start a hold only when allowPoseHoldStart is true (legacy hand-off mode)', () => {
    const z = buildWideZoneTargets(1000);
    const lms = makePose(0.1);
    const blocked = runGestureSelector(
      {
        ...DEFAULT_LAYOUT,
        poseLandmarks: lms,
        timestampMs: 100,
        calibration: { bodyCenterX: 0.5, shoulderWidthNorm: 0.3, mirrored: false },
        settings: BASE_SETTINGS,
        targetZones: z,
        allowPoseHoldStart: false,
      },
      resetGestureState(),
    );
    expect(blocked.output.candidateSide).toBeUndefined();

    const allowed = runGestureSelector(
      {
        ...DEFAULT_LAYOUT,
        poseLandmarks: lms,
        timestampMs: 100,
        calibration: { bodyCenterX: 0.5, shoulderWidthNorm: 0.3, mirrored: false },
        settings: BASE_SETTINGS,
        targetZones: z,
        allowPoseHoldStart: true,
      },
      resetGestureState(),
    );
    expect(allowed.output.candidateSide).toBe('left');
  });
});

describe('gesture reliability v1 — same-side hold grace', () => {
  it('one missed frame does not reset when inside grace', () => {
    const { nextState: s1 } = runGestureSelector(leftHandInput(0), resetGestureState());
    const { nextState: s2 } = runGestureSelector(leftHandInput(100), s1);
    expect(s2.validHoldMs).toBeGreaterThan(0);

    const { output, nextState: s3 } = runGestureSelector(
      { ...leftHandInput(130), handLandmarks: undefined, poseLandmarks: undefined },
      s2,
    );
    expect(output.reason).toBe('grace');
    expect(output.candidateSide).toBe('left');
    expect(s3.candidateSide).toBe('left');
    expect(s3.validHoldMs).toBe(s2.validHoldMs);
  });

  it('two consecutive missed frames do not reset when inside grace window', () => {
    let state = resetGestureState();
    state = runGestureSelector(leftHandInput(0), state).nextState;
    state = runGestureSelector(leftHandInput(50), state).nextState;

    const miss = { ...leftHandInput(80), handLandmarks: undefined, poseLandmarks: undefined };
    state = runGestureSelector(miss, state).nextState;
    const { output, nextState } = runGestureSelector({ ...miss, timestampMs: 110 }, state);

    expect(output.reason).toBe('grace');
    expect(output.candidateSide).toBe('left');
    expect(nextState.graceMissCount).toBe(2);
  });

  it('missed frames do not advance hold progress', () => {
    let state = resetGestureState();
    state = runGestureSelector(leftHandInput(0), state).nextState;
    state = runGestureSelector(leftHandInput(100), state).nextState;
    const progressBefore = (state.validHoldMs ?? 0) / BASE_SETTINGS.minHoldMs;

    const { output } = runGestureSelector(
      { ...leftHandInput(140), handLandmarks: undefined, poseLandmarks: undefined },
      state,
    );
    expect(output.holdProgress).toBeCloseTo(progressBefore, 5);
  });

  it('miss beyond grace limits resets hold', () => {
    let state = resetGestureState();
    state = runGestureSelector(leftHandInput(0), state).nextState;
    state = runGestureSelector(leftHandInput(50), state).nextState;

    const miss = { ...leftHandInput(0), handLandmarks: undefined, poseLandmarks: undefined };
    state = runGestureSelector({ ...miss, timestampMs: 100 }, state).nextState;
    state = runGestureSelector({ ...miss, timestampMs: 130 }, state).nextState;
    const { output, nextState } = runGestureSelector({ ...miss, timestampMs: 160 }, state);

    expect(output.candidateSide).toBeUndefined();
    expect(nextState.candidateSide).toBeUndefined();
    expect(nextState.validHoldMs).toBeUndefined();
  });

  it('grace window is bounded by time and consecutive misses', () => {
    expect(HOLD_GRACE_MAX_MS).toBe(100);
    expect(HOLD_GRACE_MAX_CONSECUTIVE_MISSES).toBe(2);

    let state = resetGestureState();
    state = runGestureSelector(leftHandInput(0), state).nextState;
    state = runGestureSelector(leftHandInput(40), state).nextState;

    const miss = { ...leftHandInput(0), handLandmarks: undefined, poseLandmarks: undefined };
    state = runGestureSelector({ ...miss, timestampMs: 100 }, state).nextState;
    const { output } = runGestureSelector({ ...miss, timestampMs: 210 }, state);

    expect(output.candidateSide).toBeUndefined();
  });

  it('side switch resets immediately', () => {
    const z = zones();
    const leftCx = (z.left.hit.xMin + z.left.hit.xMax) / 2;
    const rightCx = (z.right.hit.xMin + z.right.hit.xMax) / 2;

    let state = resetGestureState();
    state = runGestureSelector(leftHandInput(0), state).nextState;
    state = runGestureSelector(leftHandInput(200), state).nextState;

    const { nextState } = runGestureSelector(
      {
        ...leftHandInput(250),
        handLandmarks: [makeHand(rightCx, 0.53, 'right')],
      },
      state,
    );
    expect(nextState.candidateSide).toBe('right');
    expect(nextState.validHoldMs).toBe(0);
    expect(nextState.holdInitiatedByHand).toBe(true);
  });

  it('neutral center blocks grace and resets', () => {
    let state = resetGestureState();
    state = runGestureSelector(leftHandInput(0), state).nextState;
    state = runGestureSelector(leftHandInput(80), state).nextState;

    const { output, nextState } = runGestureSelector(
      {
        ...leftHandInput(120),
        handLandmarks: [makeHand(0.5, 0.53)],
      },
      state,
    );
    expect(output.reason).toBe('neutral_zone');
    expect(nextState.candidateSide).toBeUndefined();
  });

  it('wrong_side resets in gesture test mode', () => {
    const z = zones();
    const rightCx = (z.right.hit.xMin + z.right.hit.xMax) / 2;
    let state = resetGestureState();
    state = runGestureSelector(leftHandInput(0), state).nextState;

    const { output, nextState } = runGestureSelector(
      {
        ...leftHandInput(100),
        handLandmarks: [makeHand(rightCx, 0.53, 'right')],
        requiredSide: 'left',
      },
      state,
    );
    expect(output.reason).toBe('wrong_side');
    expect(nextState.candidateSide).toBeUndefined();
  });
});

describe('gesture reliability v1 — pose preserve-only', () => {
  it('pose wrist cannot start a hold when hand landmarker is enabled', () => {
    const z = zones();
    const cx = (z.left.hit.xMin + z.left.hit.xMax) / 2;
    const { output } = runGestureSelector(
      {
        ...DEFAULT_LAYOUT,
        poseLandmarks: makePose(cx),
        timestampMs: 100,
        calibration: { bodyCenterX: 0.5, shoulderWidthNorm: 0.3, mirrored: false },
        settings: BASE_SETTINGS,
        targetZones: z,
        allowPoseHoldStart: false,
      },
      resetGestureState(),
    );
    expect(output.candidateSide).toBeUndefined();
  });

  it('pose wrist preserves an already hand-started same-side hold', () => {
    const z = zones();
    const cx = (z.left.hit.xMin + z.left.hit.xMax) / 2;
    let state = resetGestureState();
    state = runGestureSelector(leftHandInput(0), state).nextState;
    state = runGestureSelector(leftHandInput(100), state).nextState;

    const { output, nextState } = runGestureSelector(
      {
        ...DEFAULT_LAYOUT,
        handLandmarks: [makeHand(0.5, 0.53)],
        poseLandmarks: makePose(cx),
        timestampMs: 200,
        calibration: { bodyCenterX: 0.5, shoulderWidthNorm: 0.3, mirrored: false },
        settings: BASE_SETTINGS,
        targetZones: z,
        allowPoseHoldStart: false,
      },
      state,
    );
    expect(output.candidateSide).toBe('left');
    expect(output.debug?.source).toBe('pose');
    expect(nextState.validHoldMs).toBeGreaterThan(state.validHoldMs ?? 0);
  });

  it('pose preserve fails when same-side wrist is not in target, causing reset', () => {
    const z = zones();
    const rightCx = (z.right.hit.xMin + z.right.hit.xMax) / 2;
    let state = resetGestureState();
    state = runGestureSelector(leftHandInput(0), state).nextState;
    state = runGestureSelector(leftHandInput(80), state).nextState;

    const { output, nextState } = runGestureSelector(
      {
        ...DEFAULT_LAYOUT,
        handLandmarks: [makeHand(0.5, 0.53)],
        poseLandmarks: makePose(0.5, rightCx),
        timestampMs: 120,
        calibration: { bodyCenterX: 0.5, shoulderWidthNorm: 0.3, mirrored: false },
        settings: BASE_SETTINGS,
        targetZones: z,
        allowPoseHoldStart: false,
      },
      state,
    );
    expect(output.reason).toBe('neutral_zone');
    expect(nextState.candidateSide).toBeUndefined();
  });

  it('pose-only cannot lock without a prior hand-started hold', () => {
    const z = buildWideZoneTargets(1000);
    const input = {
      ...DEFAULT_LAYOUT,
      poseLandmarks: makePose(0.1),
      calibration: { bodyCenterX: 0.5, shoulderWidthNorm: 0.3, mirrored: false },
      settings: { ...BASE_SETTINGS, minHoldMs: 600 },
      targetZones: z,
      allowPoseHoldStart: true,
    };
    const { nextState: s1 } = runGestureSelector({ ...input, timestampMs: 0 }, resetGestureState());
    const { output } = runGestureSelector({ ...input, timestampMs: 700 }, s1);
    expect(output.lockedSide).toBeUndefined();
    expect(output.holdProgress).toBeLessThan(1);
    expect(s1.holdInitiatedByHand).toBeFalsy();
  });

  it('hand-started hold can lock after full meaningful hold time', () => {
    let state = resetGestureState();
    state = runGestureSelector(leftHandInput(0), state).nextState;
    const { output } = runGestureSelector(leftHandInput(650), state);
    expect(output.lockedSide).toBe('left');
    expect(output.lockEventId).toBeDefined();
  });

  it('no single-frame answer is possible', () => {
    const { output } = runGestureSelector(leftHandInput(0), resetGestureState());
    expect(output.lockedSide).toBeUndefined();
    expect(output.holdProgress).toBe(0);
  });
});

describe('gesture reliability v1 — display output during inference skip', () => {
  it('does not flash hold progress to zero when inference is busy', () => {
    const state = {
      candidateSide: 'left' as const,
      validHoldMs: 240,
      lastHoldTickMs: 100,
    };
    const last = { confidence: 0.75, holdProgress: 0.4, candidateSide: 'left' as const, reason: 'holding' };
    const display = resolveGestureDisplayOutput(false, { confidence: 0, holdProgress: 0 }, state, last, 600);
    expect(display.holdProgress).toBeCloseTo(0.4, 5);
    expect(display.candidateSide).toBe('left');
  });
});
