import { useCallback, useEffect, useState, type RefObject } from 'react';

type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void>;
};

type FullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void>;
};

const IMMERSIVE_CLASS = 'play-flow-immersive';

export function isIOSWebKit(): boolean {
  if (typeof navigator === 'undefined') return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

/** True when the browser exposes element.requestFullscreen (Android Chrome, desktop, etc.). */
export function isFullscreenApiAvailable(): boolean {
  if (typeof document === 'undefined') return false;
  const proto = HTMLElement.prototype as FullscreenElement;
  return (
    typeof proto.requestFullscreen === 'function' ||
    typeof proto.webkitRequestFullscreen === 'function'
  );
}

/** @deprecated use isFullscreenApiAvailable */
export function isFullscreenSupported(): boolean {
  return isFullscreenApiAvailable();
}

export function isMobilePlayFlowDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(pointer: coarse)').matches ||
    window.matchMedia('(max-width: 900px)').matches
  );
}

export function shouldShowFullscreenControl(): boolean {
  return isFullscreenApiAvailable() || isMobilePlayFlowDevice();
}

function activeFullscreenElement(): Element | null {
  const doc = document as FullscreenDocument;
  return document.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
}

async function requestNativeFullscreen(el: HTMLElement): Promise<boolean> {
  try {
    if (typeof el.requestFullscreen === 'function') {
      await el.requestFullscreen();
    } else if (typeof (el as FullscreenElement).webkitRequestFullscreen === 'function') {
      await (el as FullscreenElement).webkitRequestFullscreen!();
    } else if (typeof document.documentElement.requestFullscreen === 'function') {
      await document.documentElement.requestFullscreen();
    } else if (
      typeof (document.documentElement as FullscreenElement).webkitRequestFullscreen === 'function'
    ) {
      await (document.documentElement as FullscreenElement).webkitRequestFullscreen!();
    } else {
      return false;
    }
    return activeFullscreenElement() != null;
  } catch {
    return false;
  }
}

async function exitNativeFullscreen(): Promise<void> {
  const doc = document as FullscreenDocument;
  await (document.exitFullscreen?.() ?? doc.webkitExitFullscreen?.());
}

function setImmersive(el: HTMLElement, active: boolean): void {
  el.classList.toggle(IMMERSIVE_CLASS, active);
  if (active) {
    window.scrollTo(0, 1);
  }
}

/**
 * Toggle browser fullscreen on the play-flow root to hide mobile browser chrome.
 * Falls back to a fixed immersive layout on iOS where the Fullscreen API is unavailable.
 */
export function usePlayFlowFullscreen(containerRef: RefObject<HTMLElement | null>) {
  const [isNativeFullscreen, setIsNativeFullscreen] = useState(false);
  const [isImmersive, setIsImmersive] = useState(false);
  const nativeAvailable = isFullscreenApiAvailable();
  const visible = shouldShowFullscreenControl();

  useEffect(() => {
    const sync = () => {
      const el = containerRef.current;
      const native = activeFullscreenElement() === el;
      setIsNativeFullscreen(native);
      setIsImmersive(!!el?.classList.contains(IMMERSIVE_CLASS));
    };

    document.addEventListener('fullscreenchange', sync);
    document.addEventListener('webkitfullscreenchange', sync);
    sync();
    return () => {
      document.removeEventListener('fullscreenchange', sync);
      document.removeEventListener('webkitfullscreenchange', sync);
      containerRef.current?.classList.remove(IMMERSIVE_CLASS);
    };
  }, [containerRef]);

  const toggleFullscreen = useCallback(async () => {
    const el = containerRef.current;
    if (!el) return;

    if (isNativeFullscreen || activeFullscreenElement() === el) {
      await exitNativeFullscreen();
      return;
    }

    if (isImmersive || el.classList.contains(IMMERSIVE_CLASS)) {
      setImmersive(el, false);
      setIsImmersive(false);
      return;
    }

    if (nativeAvailable) {
      const entered = await requestNativeFullscreen(el);
      if (entered) return;
    }

    setImmersive(el, true);
    setIsImmersive(true);
  }, [containerRef, isImmersive, isNativeFullscreen, nativeAvailable]);

  const isExpanded = isNativeFullscreen || isImmersive;
  const mode: 'native' | 'immersive' | 'none' = isNativeFullscreen
    ? 'native'
    : isImmersive
      ? 'immersive'
      : 'none';

  return {
    isFullscreen: isExpanded,
    isNativeFullscreen,
    isImmersive,
    mode,
    nativeAvailable,
    visible,
    toggleFullscreen,
  };
}
