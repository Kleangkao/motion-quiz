/** In-memory only — latest game photos for ResultPage navigation. Not persisted. */
const photosBySessionId = new Map<string, string[]>();

export function setSessionPhotos(sessionId: string, photos: string[]): void {
  if (photos.length === 0) {
    photosBySessionId.delete(sessionId);
    return;
  }
  photosBySessionId.set(sessionId, photos);
}

export function getSessionPhotos(sessionId: string): string[] | null {
  return photosBySessionId.get(sessionId) ?? null;
}

export function clearSessionPhotos(sessionId: string): void {
  photosBySessionId.delete(sessionId);
}
