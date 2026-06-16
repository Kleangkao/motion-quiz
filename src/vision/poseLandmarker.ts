import { PoseLandmarker, type PoseLandmarkerResult } from '@mediapipe/tasks-vision';
import { getVisionFilesetResolver } from './mediaPipeLoader';
import type { Landmark } from './types';

export type PoseLandmarkerStatus = 'idle' | 'loading' | 'ready' | 'error';

export class PoseLandmarkerService {
  private landmarker: PoseLandmarker | null = null;
  private status: PoseLandmarkerStatus = 'idle';
  private error: string | null = null;
  private lastTimestampMs = -1;

  getStatus(): PoseLandmarkerStatus {
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
      this.landmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numPoses: 1,
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
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
  ): Landmark[] | null {
    if (!this.landmarker || this.status !== 'ready') return null;
    // MediaPipe requires strictly increasing timestamps
    if (timestampMs <= this.lastTimestampMs) return null;
    this.lastTimestampMs = timestampMs;

    try {
      const result: PoseLandmarkerResult = this.landmarker.detectForVideo(
        videoElement,
        timestampMs,
      );
      if (!result.landmarks || result.landmarks.length === 0) return null;
      return result.landmarks[0] as Landmark[];
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
