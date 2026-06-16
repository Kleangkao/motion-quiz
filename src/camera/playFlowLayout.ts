/** Shared landscape-first layout for calibrate / gesture-test / game (matches desktop browser). */

export const PLAY_FLOW_VIEWPORT = 'relative h-[100dvh] w-full bg-black overflow-hidden select-none';

export const PLAY_FLOW_TOP_BAR =
  'absolute top-0 left-0 right-0 safe-top z-20 grid grid-cols-3 items-center px-3 py-2 sm:px-4 sm:py-3';

export const PLAY_FLOW_PROMPT_BAND =
  'absolute top-[11%] left-0 right-0 z-10 flex flex-col items-center pointer-events-none px-4';

export const PLAY_FLOW_CARD_LEFT =
  'absolute left-[12%] top-[55%] -translate-x-1/2 -translate-y-1/2 max-w-[32vw]';

export const PLAY_FLOW_CARD_RIGHT =
  'absolute left-[88%] top-[55%] -translate-x-1/2 -translate-y-1/2 max-w-[32vw]';

export const PLAY_FLOW_GESTURE_STATUS = 'absolute bottom-6 left-0 right-0 z-10 flex justify-center pointer-events-none safe-bottom';

export function isPortraitViewport(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(orientation: portrait)').matches;
}
