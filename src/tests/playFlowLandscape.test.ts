import { afterEach, describe, expect, it, vi } from 'vitest';
import { isPortraitViewport } from '@/camera/playFlowLayout';
import {
  isFullscreenApiAvailable,
  isFullscreenSupported,
  isMobilePlayFlowDevice,
  shouldShowFullscreenControl,
} from '@/camera/usePlayFlowFullscreen';

describe('playFlowLayout', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('detects portrait viewport from matchMedia', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('portrait'),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));

    expect(isPortraitViewport()).toBe(true);
  });
});

describe('usePlayFlowFullscreen', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('detects requestFullscreen on HTMLElement prototype', () => {
    vi.stubGlobal('document', { documentElement: {} });
    vi.stubGlobal('HTMLElement', {
      prototype: { requestFullscreen: vi.fn() },
    });
    expect(isFullscreenApiAvailable()).toBe(true);
    expect(isFullscreenSupported()).toBe(true);
  });

  it('shows control on mobile even without Fullscreen API (iOS fallback)', () => {
    vi.stubGlobal('document', { documentElement: {} });
    vi.stubGlobal('HTMLElement', { prototype: {} });
    vi.stubGlobal('window', {
      matchMedia: (query: string) => ({
        matches: query.includes('coarse') || query.includes('max-width'),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    });

    expect(isFullscreenApiAvailable()).toBe(false);
    expect(isMobilePlayFlowDevice()).toBe(true);
    expect(shouldShowFullscreenControl()).toBe(true);
  });

  it('hides control on desktop without API and without coarse pointer', () => {
    vi.stubGlobal('document', { documentElement: {} });
    vi.stubGlobal('HTMLElement', { prototype: {} });
    vi.stubGlobal('window', {
      matchMedia: () => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    });

    expect(shouldShowFullscreenControl()).toBe(false);
  });
});

describe('usePlayFlowLandscape', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('unlocks orientation on cleanup', async () => {
    const unlock = vi.fn();
    vi.stubGlobal('screen', {
      orientation: {
        lock: vi.fn().mockRejectedValue(new Error('denied')),
        unlock,
      },
    });
    vi.stubGlobal('matchMedia', () => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));

    const { renderHook } = await import('@testing-library/react');
    const { usePlayFlowLandscape } = await import('@/camera/usePlayFlowLandscape');
    const { unmount } = renderHook(() => usePlayFlowLandscape());

    unmount();
    expect(unlock).toHaveBeenCalled();
  });
});
