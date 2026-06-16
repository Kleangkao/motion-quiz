function dataUrlToBlob(dataUrl: string): Blob | null {
  try {
    const [header, base64] = dataUrl.split(',');
    if (!header?.includes('base64') || !base64) return null;
    const mime = header.match(/:(.*?);/)?.[1] ?? 'image/jpeg';
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  } catch {
    return null;
  }
}

function dataUrlToFile(dataUrl: string, filename: string): File | null {
  const blob = dataUrlToBlob(dataUrl);
  if (!blob) return null;
  return new File([blob], filename, { type: blob.type });
}

export type ImageSaveMethod = 'share' | 'download' | 'open';

export interface ImageSaveResult {
  method: ImageSaveMethod;
  error?: string;
}

export function canShareImageFiles(): boolean {
  if (typeof navigator === 'undefined') return false;
  if (typeof navigator.share !== 'function' || typeof navigator.canShare !== 'function') {
    return false;
  }
  try {
    const probe = new File([''], 'probe.jpg', { type: 'image/jpeg' });
    return navigator.canShare({ files: [probe] });
  } catch {
    return false;
  }
}

/**
 * Save a data URL to the device Downloads folder (or browser save prompt).
 * Never uploads.
 */
export async function downloadImage(
  dataUrl: string,
  filename: string,
): Promise<ImageSaveResult> {
  const blob = dataUrlToBlob(dataUrl);
  if (!blob) {
    return { method: 'download', error: 'Could not prepare the image for saving. Try regenerating it.' };
  }

  let objectUrl: string | null = null;
  try {
    objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = filename;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    return { method: 'download' };
  } catch {
    try {
      if (objectUrl) {
        window.open(objectUrl, '_blank', 'noopener,noreferrer');
        return { method: 'open' };
      }
    } catch {
      // handled below
    }
    return {
      method: 'download',
      error: 'Could not save the image on this device. Try again or use Regenerate.',
    };
  } finally {
    if (objectUrl) {
      setTimeout(() => URL.revokeObjectURL(objectUrl!), 5000);
    }
  }
}

/**
 * Open the system share sheet (mobile apps, Nearby Sharing, etc.).
 * Never uploads to our servers.
 */
export async function shareImage(
  dataUrl: string,
  filename: string,
): Promise<ImageSaveResult> {
  const file = dataUrlToFile(dataUrl, filename);
  if (!file) {
    return { method: 'share', error: 'Could not prepare the image for sharing. Try regenerating it.' };
  }

  if (!canShareImageFiles()) {
    return { method: 'share', error: 'Sharing is not available on this browser. Use Download instead.' };
  }

  try {
    await navigator.share({
      files: [file],
      title: 'Seeker Motion Quiz Result',
      text: 'My quiz result (saved locally)',
    });
    return { method: 'share' };
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      return { method: 'share', error: 'Share cancelled.' };
    }
    return { method: 'share', error: 'Could not open share. Try Download instead.' };
  }
}

/**
 * @deprecated Prefer explicit downloadImage / shareImage buttons.
 * Desktop always downloads; mobile tries share first for backward compatibility.
 */
export async function downloadOrShareImage(
  dataUrl: string,
  filename: string,
): Promise<ImageSaveResult> {
  const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (mobile && canShareImageFiles()) {
    const shared = await shareImage(dataUrl, filename);
    if (!shared.error || shared.error === 'Share cancelled.') return shared;
  }
  return downloadImage(dataUrl, filename);
}
