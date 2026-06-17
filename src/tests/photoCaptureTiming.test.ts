import { describe, expect, it } from 'vitest';
import {
  FINAL_STILL_MIN_MS,
  FRAME_WARP_TIMES_MS,
  LAST_WARP_SETTLE_MS,
  LAST_WARP_START_MS,
  RUN_MS,
  STATIONARY_BEFORE_SNAP_MS,
  WARP_ANIM_MS,
  WARP_GAP_MS,
  isWarpAnimatingAt,
  msWarpAnimationRemainingAt,
  warpGapsMs,
} from '@/game/photoCaptureTiming';

describe('photoCaptureTiming', () => {
  it('uses expected timing constants', () => {
    expect(RUN_MS).toBe(3400);
    expect(WARP_ANIM_MS).toBe(320);
    expect(WARP_GAP_MS).toBe(1140);
    expect(FRAME_WARP_TIMES_MS).toEqual([0, 1140, 2280]);
    expect(LAST_WARP_START_MS).toBe(2280);
    expect(LAST_WARP_SETTLE_MS).toBe(2600);
    expect(STATIONARY_BEFORE_SNAP_MS).toBe(800);
  });

  it('schedules exactly three frame movements', () => {
    expect(FRAME_WARP_TIMES_MS).toHaveLength(3);
  });

  it('spaces warp starts evenly', () => {
    const gaps = warpGapsMs();
    expect(gaps).toEqual([WARP_GAP_MS, WARP_GAP_MS]);
    expect(gaps[0]).toBe(gaps[1]);
  });

  it('keeps the frame still before snap for at least FINAL_STILL_MIN_MS', () => {
    expect(STATIONARY_BEFORE_SNAP_MS).toBeGreaterThanOrEqual(FINAL_STILL_MIN_MS);
  });

  it('has no warp scheduled after the final movement', () => {
    const afterLast = FRAME_WARP_TIMES_MS.filter((t) => t > LAST_WARP_START_MS);
    expect(afterLast).toEqual([]);
  });

  it('has no warp animation remaining at snap', () => {
    expect(isWarpAnimatingAt(RUN_MS)).toBe(false);
    expect(msWarpAnimationRemainingAt(RUN_MS)).toBe(0);
  });
});
