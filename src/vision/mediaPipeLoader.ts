/**
 * Lazy-load MediaPipe Tasks Vision WASM.
 * Returns the FilesetResolver result for reuse by multiple landmarkers.
 */
import { FilesetResolver } from '@mediapipe/tasks-vision';

let visionPromise: Promise<Awaited<ReturnType<typeof FilesetResolver.forVisionTasks>>> | null = null;

export async function getVisionFilesetResolver() {
  if (!visionPromise) {
    visionPromise = FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.9/wasm',
    );
  }
  return visionPromise;
}
