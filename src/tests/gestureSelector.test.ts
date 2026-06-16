import { describe, it, expect, beforeEach } from 'vitest';
import {
  runGestureSelector,
  resetGestureState,
  applyMirror,
} from '@/vision/gestureSelector';
import { sideFromDisplayX as wideSideFromDisplayX } from '@/vision/gestureSelectorWide';
import type { GestureSelectorState, GestureSelectorInput, Landmark } from '@/vision/types';
import { PRESET_THRESHOLDS } from '@/vision/types';
import { buildWideZoneTargets } from '@/vision/targetZones';

function makeLandmarks(overrides: Partial<Record<number, Partial<Landmark>>> = {}): Landmark[] {
  const lms: Landmark[] = Array.from({ length: 33 }, () => ({
    x: 0.5,
    y: 0.5,
    z: 0,
    visibility: 0.9,
  }));
  for (const [idx, val] of Object.entries(overrides)) {
    lms[Number(idx)] = { ...lms[Number(idx)], ...val };
  }
  return lms;
}

const DEFAULT_CAL = { bodyCenterX: 0.5, shoulderWidthNorm: 0.3, mirrored: false };

const DEFAULT_LAYOUT = {
  videoWidth: 1000,
  videoHeight: 800,
  displayWidth: 1000,
  displayHeight: 800,
  mirrored: false,
};

const BASE_INPUT: Omit<GestureSelectorInput, 'poseLandmarks' | 'handLandmarks' | 'timestampMs'> = {
  ...DEFAULT_LAYOUT,
  calibration: DEFAULT_CAL,
  settings: PRESET_THRESHOLDS.normal,
};

describe('mirror and wide-zone mapping', () => {
  it('non-mirrored: low x is left in wide zones', () => {
    expect(wideSideFromDisplayX(0.2, PRESET_THRESHOLDS.normal)).toBe('left');
    expect(wideSideFromDisplayX(0.8, PRESET_THRESHOLDS.normal)).toBe('right');
  });

  it('applyMirror flips x', () => {
    expect(applyMirror(0.85, true)).toBeLessThan(0.4);
  });
});

describe('runGestureSelector — wide-zone-debug', () => {
  let state: GestureSelectorState;
  const wideZones = buildWideZoneTargets(1000);

  beforeEach(() => {
    state = resetGestureState();
  });

  it('returns no candidate when no landmarks given', () => {
    const { output } = runGestureSelector({ ...BASE_INPUT, timestampMs: 0 }, state);
    expect(output.reason).toBe('no_landmarks');
  });

  it('detects left in wide left zone with extended arm', () => {
    const hand = Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.5 }));
    hand[8] = { x: 0.15, y: 0.5 };
    hand[0] = { x: 0.2, y: 0.55 };
    const { output } = runGestureSelector(
      {
        ...BASE_INPUT,
        handLandmarks: [hand],
        timestampMs: 100,
        targetZones: wideZones,
      },
      state,
    );
    expect(output.candidateSide).toBe('left');
  });

  it('locks after minHoldMs in wide zone', () => {
    const hand = Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.5 }));
    hand[8] = { x: 0.15, y: 0.5 };
    hand[0] = { x: 0.2, y: 0.55 };
    const input = {
      ...BASE_INPUT,
      handLandmarks: [hand],
      targetZones: wideZones,
      settings: { ...PRESET_THRESHOLDS.normal, minHoldMs: 550 },
    };
    const { nextState: s1 } = runGestureSelector({ ...input, timestampMs: 0 }, state);
    const { output } = runGestureSelector({ ...input, timestampMs: 600 }, s1);
    expect(output.lockedSide).toBe('left');
  });

  it('pending lock persists across frames', () => {
    const hand = Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.5 }));
    hand[8] = { x: 0.15, y: 0.5 };
    hand[0] = { x: 0.2, y: 0.55 };
    const input = {
      ...BASE_INPUT,
      handLandmarks: [hand],
      targetZones: wideZones,
      settings: { ...PRESET_THRESHOLDS.normal, minHoldMs: 550 },
    };
    const { nextState: s1 } = runGestureSelector({ ...input, timestampMs: 0 }, state);
    const { nextState: s2 } = runGestureSelector({ ...input, timestampMs: 600 }, s1);
    const { output: out3 } = runGestureSelector({ ...input, timestampMs: 900 }, s2);
    expect(out3.lockedSide).toBe('left');
    expect(out3.reason).toBe('locked');
  });
});

describe('runGestureSelector — pose wide zone', () => {
  it('detects left candidate when left wrist is in left zone', () => {
    const lms = makeLandmarks({
      11: { x: 0.5, y: 0.3, visibility: 0.9 },
      12: { x: 0.55, y: 0.3, visibility: 0.9 },
      15: { x: 0.1, y: 0.5, visibility: 0.9 },
    });
    const { output } = runGestureSelector(
      {
        ...BASE_INPUT,
        poseLandmarks: lms,
        timestampMs: 100,
        targetZones: buildWideZoneTargets(1000),
      },
      resetGestureState(),
    );
    expect(output.candidateSide).toBe('left');
  });
});
