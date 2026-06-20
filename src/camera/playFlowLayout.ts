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

/** Gameplay band between top chrome and bottom gesture status — centers quiz content. */
export const PLAY_FLOW_GAME_STAGE =
  'play-flow-game-stage absolute inset-x-0 z-10 flex flex-col items-center justify-center gap-4 pointer-events-none safe-left safe-right top-[calc(env(safe-area-inset-top,0px)+3.25rem)] bottom-[calc(env(safe-area-inset-bottom,0px)+4.5rem)] sm:gap-6 sm:top-[calc(env(safe-area-inset-top,0px)+3.75rem)] sm:bottom-[calc(env(safe-area-inset-bottom,0px)+5rem)]';

export const PLAY_FLOW_PROMPT_BAND =
  'play-flow-prompt-band flex w-full max-w-3xl flex-col items-center pointer-events-none px-4 sm:px-6';

/** Balanced TRUE/FALSE row beneath the centered question. */
export const PLAY_FLOW_CHOICES_ROW =
  'play-flow-choices-row grid w-full max-w-4xl grid-cols-2 items-center gap-3 px-2 sm:max-w-5xl sm:gap-8 sm:px-4';

const PLAY_FLOW_GAME_CARD =
  'play-flow-game-card relative flex max-w-[44vw] sm:max-w-[12.5rem]';

export const PLAY_FLOW_GAME_CARD_LEFT = `${PLAY_FLOW_GAME_CARD} play-flow-card-left justify-self-end justify-end pr-1 sm:pr-2 pointer-events-auto`;

export const PLAY_FLOW_GAME_CARD_RIGHT = `${PLAY_FLOW_GAME_CARD} play-flow-card-right justify-self-start justify-start pl-1 sm:pl-2 pointer-events-auto`;

/** Compact centered instruction for gesture test (avoids top-bar overlap). */
export const PLAY_FLOW_GESTURE_TEST_PROMPT =
  'play-flow-gesture-test-prompt absolute top-1/2 left-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 pointer-events-none px-4';

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
