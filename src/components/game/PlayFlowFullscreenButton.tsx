import type { RefObject } from 'react';
import { usePlayFlowFullscreen, isIOSWebKit } from '@/camera/usePlayFlowFullscreen';
import { PLAY_FLOW_BAR_BTN, PLAY_FLOW_FULLSCREEN_BTN } from '@/camera/playFlowLayout';

interface Props {
  containerRef: RefObject<HTMLElement | null>;
  /** `corner` = bottom-left float; `bar` = inline in top bar (calibration). */
  variant?: 'corner' | 'bar';
}

export function PlayFlowFullscreenButton({ containerRef, variant = 'corner' }: Props) {
  const { isFullscreen, mode, nativeAvailable, visible, toggleFullscreen } =
    usePlayFlowFullscreen(containerRef);

  if (!visible) return null;

  const isIOS = isIOSWebKit();

  const label = isFullscreen
    ? mode === 'native'
      ? 'Exit FS'
      : 'Shrink'
    : nativeAvailable
      ? 'Full screen'
      : 'Expand';

  const hint = isFullscreen
    ? 'Exit expanded view'
    : nativeAvailable
      ? 'Hide browser bars (full screen)'
      : isIOS
        ? 'Use more screen (Safari keeps the top URL bar on iPhone)'
        : 'Expand view to use more of the screen';

  const className = variant === 'bar' ? PLAY_FLOW_BAR_BTN : PLAY_FLOW_FULLSCREEN_BTN;

  return (
    <button
      type="button"
      onClick={() => void toggleFullscreen()}
      className={className}
      aria-label={hint}
      title={hint}
    >
      {variant === 'bar' ? (
        <span className="text-xs font-bold whitespace-nowrap">{label}</span>
      ) : (
        <>
          <span aria-hidden="true" className="text-base leading-none">
            {isFullscreen ? '⤡' : '⛶'}
          </span>
          <span className="text-xs font-bold leading-tight">{label}</span>
        </>
      )}
    </button>
  );
}
