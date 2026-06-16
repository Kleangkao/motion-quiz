import { afterEach, describe, expect, it, vi } from 'vitest';
import { isPortraitViewport } from '@/camera/playFlowLayout';

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
