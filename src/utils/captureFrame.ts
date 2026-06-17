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
  mirrored: boolean,
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

  // CSS scale-x-[-1] mirrors the preview; drawImage reads raw video pixels.
  const fxForSource = mirrored ? containerRect.width - fx - fw : fx;

  const sx = Math.max(0, (fxForSource - offsetX) / scale);
  const sy = Math.max(0, (fy - offsetY) / scale);
  const sw = fw / scale;
  const sh = fh / scale;

  return { sx, sy, sw, sh, fw, fh };
}

function isMediaStreamLike(
  value: unknown,
): value is { getVideoTracks(): MediaStreamTrack[] } {
  return (
    value != null &&
    typeof value === 'object' &&
    typeof (value as MediaStream).getVideoTracks === 'function'
  );
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
  const crop = computeCropRegion(video, frameRect, containerRect, mirrored);
  if (!crop) return null;
  return renderCropToDataUrl(video, crop, mirrored, video.videoWidth, video.videoHeight);
}

/**
 * Capture the visible video preview into a JPEG data URL.
 * Uses the HTMLVideoElement as the source of truth (WYSIWYG with on-screen preview).
 * Frame/container rects are sampled after the fresh-frame wait so crop matches the draw.
 */
export async function captureVideoFrameAsync(
  video: HTMLVideoElement,
  getFrameRect: () => FrameRect,
  getContainerRect: () => DOMRect,
  mirrored: boolean,
): Promise<string | null> {
  await waitForFreshVideoFrame(video);

  const frameRect = getFrameRect();
  const containerRect = getContainerRect();
  const fromVideo = captureVideoFrame(video, frameRect, containerRect, mirrored);
  if (fromVideo) return fromVideo;

  // Last resort only: ImageCapture can lag behind the painted <video> preview on mobile.
  return captureViaImageCaptureFallback(video, frameRect, containerRect, mirrored);
}

async function captureViaImageCaptureFallback(
  video: HTMLVideoElement,
  frameRect: FrameRect,
  containerRect: DOMRect,
  mirrored: boolean,
): Promise<string | null> {
  const crop = computeCropRegion(video, frameRect, containerRect, mirrored);
  if (!crop) return null;

  const stream = video.srcObject;
  if (!isMediaStreamLike(stream)) return null;

  const track = stream.getVideoTracks()[0];
  if (!track || typeof ImageCapture === 'undefined') return null;

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
    return dataUrl;
  } catch {
    return null;
  }
}
