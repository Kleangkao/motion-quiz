import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { PhotoCaptureMiniGame } from '@/components/game/PhotoCaptureMiniGame';
import {
  FLASH_PREVIEW_DELAY_MS,
  FRAME_WARP_TIMES_MS,
  LAST_WARP_SETTLE_MS,
  RUN_MS,
} from '@/game/photoCaptureTiming';

const captureVideoFrameAsync = vi.fn();

vi.mock('@/utils/captureFrame', () => ({
  captureVideoFrameAsync: (...args: unknown[]) => captureVideoFrameAsync(...args),
}));

function makeRefs() {
  const container = document.createElement('div');
  container.getBoundingClientRect = () =>
    ({
      left: 0,
      top: 0,
      width: 400,
      height: 600,
      right: 400,
      bottom: 600,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }) as DOMRect;

  const video = document.createElement('video');
  Object.defineProperty(video, 'videoWidth', { value: 1280 });
  Object.defineProperty(video, 'videoHeight', { value: 720 });

  return {
    containerRef: { current: container },
    videoRef: { current: video },
  };
}

describe('PhotoCaptureMiniGame snap timing', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    captureVideoFrameAsync.mockReset();
    captureVideoFrameAsync.mockResolvedValue('data:image/jpeg;base64,mock');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows flash at snap start before async capture resolves', async () => {
    let resolveCapture!: (value: string) => void;
    captureVideoFrameAsync.mockImplementation(
      () =>
        new Promise<string>((resolve) => {
          resolveCapture = resolve;
        }),
    );

    const { containerRef, videoRef } = makeRefs();
    render(
      <PhotoCaptureMiniGame
        videoRef={videoRef}
        containerRef={containerRef}
        mirrored={false}
        onComplete={vi.fn()}
      />,
    );

    await act(async () => {
      vi.advanceTimersByTime(RUN_MS);
    });

    expect(screen.queryByText('📸 Photo time!')).toBeNull();
    expect(document.querySelector('.animate-fade-in')).not.toBeNull();
    expect(captureVideoFrameAsync).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveCapture('data:image/jpeg;base64,mock');
      await Promise.resolve();
    });

    await act(async () => {
      vi.advanceTimersByTime(FLASH_PREVIEW_DELAY_MS);
    });

    expect(screen.getByAltText('Captured moment')).toBeTruthy();
  });

  it('passes frame rect getters into captureVideoFrameAsync', async () => {
    const { containerRef, videoRef } = makeRefs();
    render(
      <PhotoCaptureMiniGame
        videoRef={videoRef}
        containerRef={containerRef}
        mirrored={false}
        onComplete={vi.fn()}
      />,
    );

    await act(async () => {
      vi.advanceTimersByTime(RUN_MS);
      await Promise.resolve();
    });

    const [, getFrameRect, getContainerRect] = captureVideoFrameAsync.mock.calls[0] as [
      unknown,
      () => { left: number; top: number; width: number; height: number },
      () => DOMRect,
      boolean,
    ];

    expect(typeof getFrameRect).toBe('function');
    expect(typeof getContainerRect).toBe('function');
    expect(getFrameRect()).toMatchObject({
      left: expect.any(Number),
      top: expect.any(Number),
      width: expect.any(Number),
      height: expect.any(Number),
    });
    expect(getContainerRect().width).toBe(400);
  });

  it('warps exactly three times at the scheduled times', async () => {
    const warpTimes: number[] = [];
    const originalRandom = Math.random;
    let call = 0;
    Math.random = () => {
      call += 1;
      return (call * 0.17) % 1;
    };

    const { containerRef, videoRef } = makeRefs();
    render(
      <PhotoCaptureMiniGame
        videoRef={videoRef}
        containerRef={containerRef}
        mirrored={false}
        onComplete={vi.fn()}
      />,
    );

    const frame = document.querySelector('.photo-frame-warp') as HTMLDivElement;
    let lastLeft = frame.style.left;
    let lastTop = frame.style.top;

    let previousDelay = 0;
    for (const delayMs of FRAME_WARP_TIMES_MS) {
      await act(async () => {
        vi.advanceTimersByTime(delayMs - previousDelay);
      });
      previousDelay = delayMs;
      if (frame.style.left !== lastLeft || frame.style.top !== lastTop) {
        warpTimes.push(delayMs);
        lastLeft = frame.style.left;
        lastTop = frame.style.top;
      }
    }

    expect(warpTimes).toEqual([...FRAME_WARP_TIMES_MS]);
    Math.random = originalRandom;
  });

  it('keeps frame position fixed after the final warp settles', async () => {
    const { containerRef, videoRef } = makeRefs();
    render(
      <PhotoCaptureMiniGame
        videoRef={videoRef}
        containerRef={containerRef}
        mirrored={false}
        onComplete={vi.fn()}
      />,
    );

    await act(async () => {
      vi.advanceTimersByTime(LAST_WARP_SETTLE_MS + 50);
    });

    const frame = document.querySelector('.photo-frame-warp') as HTMLDivElement;
    const leftAtStable = frame.style.left;
    const topAtStable = frame.style.top;

    await act(async () => {
      vi.advanceTimersByTime(RUN_MS - LAST_WARP_SETTLE_MS - 50);
    });

    expect(frame.style.left).toBe(leftAtStable);
    expect(frame.style.top).toBe(topAtStable);
  });

  it('does not move frame geometry when flash starts', async () => {
    const { containerRef, videoRef } = makeRefs();
    render(
      <PhotoCaptureMiniGame
        videoRef={videoRef}
        containerRef={containerRef}
        mirrored={false}
        onComplete={vi.fn()}
      />,
    );

    await act(async () => {
      vi.advanceTimersByTime(RUN_MS - 1);
    });

    const frame = document.querySelector('.photo-frame-warp') as HTMLDivElement;
    const leftBeforeFlash = frame.style.left;
    const topBeforeFlash = frame.style.top;
    const transitionBeforeFlash = frame.style.transition;

    await act(async () => {
      vi.advanceTimersByTime(1);
    });

    expect(frame.style.left).toBe(leftBeforeFlash);
    expect(frame.style.top).toBe(topBeforeFlash);
    expect(frame.style.transition).toBe('none');
    expect(transitionBeforeFlash).not.toBe('none');
    expect(document.querySelector('.animate-fade-in')).not.toBeNull();
  });
});
