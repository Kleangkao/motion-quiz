import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  captureVideoFrame,
  captureVideoFrameAsync,
  waitForFreshVideoFrame,
  type FrameRect,
} from '@/utils/captureFrame';

const FRAME_RECT: FrameRect = { left: 100, top: 80, width: 200, height: 150 };
const CONTAINER_RECT = {
  left: 0,
  top: 0,
  width: 400,
  height: 600,
  right: 400,
  bottom: 600,
  x: 0,
  y: 0,
  toJSON: () => ({}),
} as DOMRect;

function makeVideoElement(options?: {
  withRvfc?: boolean;
  videoWidth?: number;
  videoHeight?: number;
  withStream?: boolean;
}): HTMLVideoElement {
  const videoWidth = options?.videoWidth ?? 1280;
  const videoHeight = options?.videoHeight ?? 720;
  const rvfc = vi.fn((cb: () => void) => {
    cb();
    return 0;
  });

  const video = {
    videoWidth,
    videoHeight,
    requestVideoFrameCallback: options?.withRvfc === false ? undefined : rvfc,
    srcObject: options?.withStream === false
      ? null
      : {
          getVideoTracks: () => [{ kind: 'video' }],
        },
  } as unknown as HTMLVideoElement;

  return video;
}

describe('captureFrame', () => {
  const drawImage = vi.fn();
  const translate = vi.fn();
  const scale = vi.fn();
  const toDataURL = vi.fn(() => 'data:image/jpeg;base64,mock');
  const grabFrame = vi.fn();
  const imageCaptureCtor = vi.fn();
  let canvasCreateCount = 0;
  let failFirstCanvasContext = false;

  beforeEach(() => {
    drawImage.mockClear();
    translate.mockClear();
    scale.mockClear();
    toDataURL.mockClear();
    grabFrame.mockReset();
    imageCaptureCtor.mockReset();
    canvasCreateCount = 0;
    failFirstCanvasContext = false;

    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'canvas') {
        canvasCreateCount += 1;
        const canvasIndex = canvasCreateCount;
        return {
          width: 0,
          height: 0,
          getContext: () => {
            if (failFirstCanvasContext && canvasIndex === 1) return null;
            return {
              translate,
              scale,
              drawImage,
            };
          },
          toDataURL,
        } as unknown as HTMLCanvasElement;
      }
      return originalCreateElement(tagName);
    });

    vi.stubGlobal(
      'requestAnimationFrame',
      (cb: FrameRequestCallback) => {
        cb(0);
        return 0;
      },
    );

    class MockImageCapture {
      grabFrame = grabFrame;
      constructor(track: unknown) {
        imageCaptureCtor(track);
      }
    }
    vi.stubGlobal('ImageCapture', MockImageCapture);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('waitForFreshVideoFrame uses requestVideoFrameCallback when available', async () => {
    const video = makeVideoElement({ withRvfc: true });
    await waitForFreshVideoFrame(video);
    expect(video.requestVideoFrameCallback).toHaveBeenCalled();
  });

  it('captureVideoFrame draws from the video element and returns a data URL', () => {
    const video = makeVideoElement();
    const result = captureVideoFrame(video, FRAME_RECT, CONTAINER_RECT, true);

    expect(result).toBe('data:image/jpeg;base64,mock');
    expect(drawImage).toHaveBeenCalledWith(
      video,
      expect.any(Number),
      expect.any(Number),
      expect.any(Number),
      expect.any(Number),
      0,
      0,
      expect.any(Number),
      expect.any(Number),
    );
    expect(translate).toHaveBeenCalled();
    expect(scale).toHaveBeenCalledWith(-1, 1);
  });

  it('mirrored crop maps a screen-left frame to the opposite source region', () => {
    const video = makeVideoElement();
    const leftFrame: FrameRect = { left: 20, top: 80, width: 150, height: 150 };

    captureVideoFrame(video, leftFrame, CONTAINER_RECT, false);
    const sxNormal = drawImage.mock.calls[0]![1] as number;

    drawImage.mockClear();
    translate.mockClear();
    scale.mockClear();

    captureVideoFrame(video, leftFrame, CONTAINER_RECT, true);
    const sxMirrored = drawImage.mock.calls[0]![1] as number;

    expect(sxMirrored).toBeGreaterThan(sxNormal);
    expect(scale).toHaveBeenCalledWith(-1, 1);
  });

  it('captureVideoFrameAsync waits for a fresh frame before drawing from video', async () => {
    const video = makeVideoElement();
    const result = await captureVideoFrameAsync(
      video,
      () => FRAME_RECT,
      () => CONTAINER_RECT,
      false,
    );

    expect(video.requestVideoFrameCallback).toHaveBeenCalledTimes(1);
    expect(result).toBe('data:image/jpeg;base64,mock');
    expect(drawImage).toHaveBeenCalledWith(
      video,
      expect.any(Number),
      expect.any(Number),
      expect.any(Number),
      expect.any(Number),
      0,
      0,
      expect.any(Number),
      expect.any(Number),
    );
    expect(imageCaptureCtor).not.toHaveBeenCalled();
    expect(grabFrame).not.toHaveBeenCalled();
  });

  it('reads frame rect after waiting for a fresh video frame', async () => {
    const video = makeVideoElement();
    let rectRead = false;
    const rvfc = vi.fn((cb: () => void) => {
      expect(rectRead).toBe(false);
      cb();
      return 0;
    });
    video.requestVideoFrameCallback = rvfc;

    await captureVideoFrameAsync(
      video,
      () => {
        rectRead = true;
        return FRAME_RECT;
      },
      () => CONTAINER_RECT,
      false,
    );

    expect(rectRead).toBe(true);
    expect(rvfc).toHaveBeenCalledTimes(1);
  });

  it('does not use ImageCapture when the video draw path succeeds', async () => {
    const video = makeVideoElement({ withStream: true });
    await captureVideoFrameAsync(
      video,
      () => FRAME_RECT,
      () => CONTAINER_RECT,
      false,
    );

    expect(imageCaptureCtor).not.toHaveBeenCalled();
    expect(grabFrame).not.toHaveBeenCalled();
  });

  it('falls back to ImageCapture only when video draw returns null', async () => {
    failFirstCanvasContext = true;
    const video = makeVideoElement({ withStream: true });
    const bitmap = {
      width: 1280,
      height: 720,
      close: vi.fn(),
    };
    grabFrame.mockResolvedValue(bitmap);

    const result = await captureVideoFrameAsync(
      video,
      () => FRAME_RECT,
      () => CONTAINER_RECT,
      false,
    );

    expect(imageCaptureCtor).toHaveBeenCalled();
    expect(grabFrame).toHaveBeenCalled();
    expect(drawImage).toHaveBeenCalledWith(
      bitmap,
      expect.any(Number),
      expect.any(Number),
      expect.any(Number),
      expect.any(Number),
      0,
      0,
      expect.any(Number),
      expect.any(Number),
    );
    expect(result).toBe('data:image/jpeg;base64,mock');
  });
});
