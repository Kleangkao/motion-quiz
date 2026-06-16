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

export type ImageSaveMethod = 'share' | 'download' | 'open';

export interface ImageSaveResult {
  method: ImageSaveMethod;
  error?: string;
}

/**
 * Save or share a data URL locally. Never uploads.
 * Prefers Web Share API on mobile when available.
 */
export async function downloadOrShareImage(
  dataUrl: string,
  filename: string,
): Promise<ImageSaveResult> {
  const blob = dataUrlToBlob(dataUrl);
  if (!blob) {
    return { method: 'download', error: 'Could not prepare the image for saving. Try regenerating it.' };
  }

  const file = new File([blob], filename, { type: blob.type });

  if (typeof navigator.share === 'function' && typeof navigator.canShare === 'function') {
    try {
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Seeker Motion Quiz — Game Moment',
          text: 'My quiz result (saved locally)',
        });
        return { method: 'share' };
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        return { method: 'share', error: 'Share cancelled.' };
      }
      // Fall through to download on other share failures.
    }
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
