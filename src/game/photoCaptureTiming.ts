/** Photo Moment mini-game timing (shared with tests). */

export const RUN_MS = 3400;
export const PREVIEW_MS = 1400;
export const WARP_ANIM_MS = 320;
/** Minimum still time after the last warp before snap/flash. */
export const FINAL_STILL_MIN_MS = 800;
export const FRAME_WARP_COUNT = 3;

/**
 * Even gap between warp starts so each hold feels similar.
 * Last warp ends with at least FINAL_STILL_MIN_MS before snap.
 */
export const WARP_GAP_MS =
  (RUN_MS - FINAL_STILL_MIN_MS - WARP_ANIM_MS) / (FRAME_WARP_COUNT - 1);

export const FRAME_WARP_TIMES_MS = [0, WARP_GAP_MS, WARP_GAP_MS * 2] as const;

export const LAST_WARP_START_MS = FRAME_WARP_TIMES_MS[FRAME_WARP_TIMES_MS.length - 1];
/** When the final warp CSS transition finishes. */
export const LAST_WARP_SETTLE_MS = LAST_WARP_START_MS + WARP_ANIM_MS;
/** How long the frame is stationary before snap/flash. */
export const STATIONARY_BEFORE_SNAP_MS = RUN_MS - LAST_WARP_SETTLE_MS;
export const COUNTDOWN_TICK_MS = 200;
export const FLASH_PREVIEW_DELAY_MS = 180;

/** Fixed spawn before the first scheduled warp (not counted as a movement). */
export const FRAME_SPAWN_POSITION = { x: 0.5, y: 0.42 } as const;

export function warpAnimationEndMs(warpStartMs: number): number {
  return warpStartMs + WARP_ANIM_MS;
}

/** True when a warp CSS transition would still be running at snapMs. */
export function isWarpAnimatingAt(snapMs: number = RUN_MS): boolean {
  return snapMs < LAST_WARP_SETTLE_MS;
}

export function msWarpAnimationRemainingAt(snapMs: number = RUN_MS): number {
  return Math.max(0, LAST_WARP_SETTLE_MS - snapMs);
}

/** Gaps between consecutive warp start times (should be equal). */
export function warpGapsMs(): number[] {
  return FRAME_WARP_TIMES_MS.slice(1).map((t, i) => t - FRAME_WARP_TIMES_MS[i]!);
}
