import { HandLandmarker, type HandLandmarkerResult } from '@mediapipe/tasks-vision';
import { getVisionFilesetResolver } from './mediaPipeLoader';
import type { Landmark } from './types';

export type HandLandmarkerStatus = 'idle' | 'loading' | 'ready' | 'error';

/** MediaPipe hand landmark indices */
export const HandLandmarkIndex = {
  WRIST: 0,
  INDEX_FINGER_TIP: 8,
  MIDDLE_FINGER_TIP: 12,
  RING_FINGER_TIP: 16,
  PINKY_TIP: 20,
} as const;

export class HandLandmarkerService {
  private landmarker: HandLandmarker | null = null;
  private status: HandLandmarkerStatus = 'idle';
  private error: string | null = null;
  private lastTimestampMs = -1;

  getStatus(): HandLandmarkerStatus {
    return this.status;
  }

  getError(): string | null {
    return this.error;
  }

  async load(): Promise<void> {
    if (this.status === 'ready' || this.status === 'loading') return;
    this.status = 'loading';
    this.error = null;
    try {
      const vision = await getVisionFilesetResolver();
      this.landmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numHands: 2,
        minHandDetectionConfidence: 0.5,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
      this.status = 'ready';
    } catch (err) {
      this.status = 'error';
      this.error = err instanceof Error ? err.message : String(err);
      throw err;
    }
  }

  detectForVideo(
    videoElement: HTMLVideoElement,
    timestampMs: number,
  ): Landmark[][] | null {
    if (!this.landmarker || this.status !== 'ready') return null;
    if (timestampMs <= this.lastTimestampMs) return null;
    this.lastTimestampMs = timestampMs;

    try {
      const result: HandLandmarkerResult = this.landmarker.detectForVideo(
        videoElement,
        timestampMs,
      );
      if (!result.landmarks || result.landmarks.length === 0) return null;
      return result.landmarks as Landmark[][];
    } catch {
      return null;
    }
  }

  close(): void {
    this.landmarker?.close();
    this.landmarker = null;
    this.status = 'idle';
    this.lastTimestampMs = -1;
  }
}
