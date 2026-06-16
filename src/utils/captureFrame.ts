/**
 * Capture a region of the live video (object-cover) into a JPEG data URL.
 * Coordinates are in container pixel space; frameRect is absolute viewport coords.
 */
export function captureVideoFrame(
  video: HTMLVideoElement,
  frameRect: { left: number; top: number; width: number; height: number },
  containerRect: DOMRect,
  mirrored: boolean,
): string | null {
  if (video.videoWidth <= 0 || video.videoHeight <= 0) return null;

  const fw = Math.round(frameRect.width);
  const fh = Math.round(frameRect.height);
  if (fw <= 0 || fh <= 0) return null;

  const canvas = document.createElement('canvas');
  canvas.width = fw;
  canvas.height = fh;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

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

  if (mirrored) {
    ctx.translate(fw, 0);
    ctx.scale(-1, 1);
  }

  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, fw, fh);
  return canvas.toDataURL('image/jpeg', 0.88);
}
