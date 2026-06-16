export interface FrameRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface CropRegion {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
  fw: number;
  fh: number;
}

function computeCropRegion(
  video: HTMLVideoElement,
  frameRect: FrameRect,
  containerRect: DOMRect,
): CropRegion | null {
  if (video.videoWidth <= 0 || video.videoHeight <= 0) return null;

  const fw = Math.round(frameRect.width);
  const fh = Math.round(frameRect.height);
  if (fw <= 0 || fh <= 0) return null;

  const vw = video.videoWidth;
  const vh = video.videoHeight;
  const scale = Math.max(containerRect.width / vw, containerRect.height / vh);
  const displayedW = vw * scale;
  const displayedH = vh * scale;
  const offsetX = (containerRect.width - displayedW) / 2;
  const offsetY = (containerRect.height - displayedH) / 2;

  const fx = frameRect.left - containerRect.left;
  const fy = frameRect.top - containerRect.top;

  const sx = Math.max(0, (fx - offsetX) / scale);
  const sy = Math.max(0, (fy - offsetY) / scale);
  const sw = fw / scale;
  const sh = fh / scale;

  return { sx, sy, sw, sh, fw, fh };
}

function renderCropToDataUrl(
  source: CanvasImageSource,
  crop: CropRegion,
  mirrored: boolean,
  sourceWidth: number,
  sourceHeight: number,
): string | null {
  const canvas = document.createElement('canvas');
  canvas.width = crop.fw;
  canvas.height = crop.fh;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const sx = Math.max(0, Math.min(crop.sx, sourceWidth - 1));
  const sy = Math.max(0, Math.min(crop.sy, sourceHeight - 1));
  const sw = Math.min(crop.sw, sourceWidth - sx);
  const sh = Math.min(crop.sh, sourceHeight - sy);

  if (mirrored) {
    ctx.translate(crop.fw, 0);
    ctx.scale(-1, 1);
  }

  ctx.drawImage(source, sx, sy, sw, sh, 0, 0, crop.fw, crop.fh);
  return canvas.toDataURL('image/jpeg', 0.88);
}

/** Wait for the next composited video frame (reduces stale captures). */
export async function waitForFreshVideoFrame(video: HTMLVideoElement): Promise<void> {
  if (typeof video.requestVideoFrameCallback === 'function') {
    await new Promise<void>((resolve) => {
      video.requestVideoFrameCallback(() => resolve());
    });
    return;
  }
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

/**
 * Capture a region of the live video (object-cover) into a JPEG data URL.
 * Coordinates are in container pixel space; frameRect is absolute viewport coords.
 */
export function captureVideoFrame(
  video: HTMLVideoElement,
  frameRect: FrameRect,
  containerRect: DOMRect,
  mirrored: boolean,
): string | null {
  const crop = computeCropRegion(video, frameRect, containerRect);
  if (!crop) return null;
  return renderCropToDataUrl(video, crop, mirrored, video.videoWidth, video.videoHeight);
}

/**
 * Prefer ImageCapture / fresh frame callback for lower capture latency than video buffer.
 */
export async function captureVideoFrameAsync(
  video: HTMLVideoElement,
  frameRect: FrameRect,
  containerRect: DOMRect,
  mirrored: boolean,
): Promise<string | null> {
  await waitForFreshVideoFrame(video);

  const crop = computeCropRegion(video, frameRect, containerRect);
  if (!crop) return null;

  const stream = video.srcObject;
  if (stream instanceof MediaStream) {
    const track = stream.getVideoTracks()[0];
    if (track && typeof ImageCapture !== 'undefined') {
      try {
        const capture = new ImageCapture(track);
        const bitmap = await capture.grabFrame();
        const dataUrl = renderCropToDataUrl(
          bitmap,
          crop,
          mirrored,
          bitmap.width,
          bitmap.height,
        );
        bitmap.close();
        if (dataUrl) return dataUrl;
      } catch {
        // Fall back to video element draw.
      }
    }
  }

  await waitForFreshVideoFrame(video);
  return captureVideoFrame(video, frameRect, containerRect, mirrored);
}
