/** Shared landscape-first layout for calibrate / gesture-test / game (matches desktop browser). */

export const PLAY_FLOW_FACING = 'user' as const;

export const PLAY_FLOW_VIEWPORT =
  'play-flow-viewport relative h-[100dvh] w-full bg-black overflow-hidden select-none';

export const PLAY_FLOW_TOP_BAR =
  'play-flow-top-bar absolute top-0 left-0 right-0 safe-top safe-left safe-right z-20 grid grid-cols-3 items-center px-3 py-2.5 sm:px-4 sm:py-3';

/** Minimum 44×44px tap target for play-flow chrome controls. */
export const PLAY_FLOW_BAR_BTN = 'play-flow-bar-btn btn btn-secondary btn-sm';

export const PLAY_FLOW_FULLSCREEN_BTN =
  'play-flow-fullscreen-btn btn btn-secondary z-30 shadow-lg bg-black/55 backdrop-blur-sm border-white/25';

export const PLAY_FLOW_PROMPT_BAND =
  'play-flow-prompt-band absolute top-[11%] left-0 right-0 z-10 flex flex-col items-center pointer-events-none px-4';

export const PLAY_FLOW_CARD_SLOT =
  'play-flow-card-slot absolute -translate-x-1/2 -translate-y-1/2 max-w-[32vw]';

export const PLAY_FLOW_CARD_LEFT = `${PLAY_FLOW_CARD_SLOT} left-[12%] top-[55%]`;

export const PLAY_FLOW_CARD_RIGHT = `${PLAY_FLOW_CARD_SLOT} left-[88%] top-[55%]`;

export const PLAY_FLOW_GESTURE_STATUS =
  'play-flow-gesture-status absolute bottom-6 left-0 right-0 z-10 flex justify-center pointer-events-none safe-bottom';

export function isPortraitViewport(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(orientation: portrait)').matches;
}
