import { useEffect, useState } from 'react';
import { isPortraitViewport } from './playFlowLayout';

/**
 * Lock landscape while the play flow (calibrate / gesture-test / game) is mounted.
 * Falls back to a rotate prompt when the browser cannot lock orientation.
 */
export function usePlayFlowLandscape(): { showRotatePrompt: boolean; isLandscape: boolean } {
  const [showRotatePrompt, setShowRotatePrompt] = useState(() => isPortraitViewport());

  useEffect(() => {
    const sync = () => setShowRotatePrompt(isPortraitViewport());

    const lockLandscape = async () => {
      try {
        await screen.orientation?.lock?.('landscape');
      } catch {
        // iOS Safari and some browsers require a user gesture or deny lock.
      }
      sync();
    };

    void lockLandscape();

    window.addEventListener('resize', sync);
    const mq = window.matchMedia('(orientation: portrait)');
    mq.addEventListener('change', sync);

    return () => {
      window.removeEventListener('resize', sync);
      mq.removeEventListener('change', sync);
      try {
        screen.orientation?.unlock?.();
      } catch {
        // ignore
      }
    };
  }, []);

  return { showRotatePrompt, isLandscape: !showRotatePrompt };
}
