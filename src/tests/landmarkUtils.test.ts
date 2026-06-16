import { describe, it, expect } from 'vitest';
import { landmarkToContainerNorm } from '@/vision/landmarkUtils';

describe('landmarkToContainerNorm (object-fit: cover)', () => {
  it('maps 1:1 when video and container share aspect ratio', () => {
    const layout = {
      videoWidth: 1280,
      videoHeight: 720,
      displayWidth: 1280,
      displayHeight: 720,
      mirrored: false,
    };
    const { x, y } = landmarkToContainerNorm({ x: 0.25, y: 0.75 }, layout);
    expect(x).toBeCloseTo(0.25);
    expect(y).toBeCloseTo(0.75);
  });

  it('adjusts y when video is taller than container (vertical crop)', () => {
    const layout = {
      videoWidth: 720,
      videoHeight: 1280,
      displayWidth: 1000,
      displayHeight: 800,
      mirrored: false,
    };
    const top = landmarkToContainerNorm({ x: 0.5, y: 0 }, layout);
    const bottom = landmarkToContainerNorm({ x: 0.5, y: 1 }, layout);
    expect(top.y).toBeLessThan(0);
    expect(bottom.y).toBeGreaterThan(1);
  });

  it('mirrors x in container space', () => {
    const layout = {
      videoWidth: 1280,
      videoHeight: 720,
      displayWidth: 1000,
      displayHeight: 800,
      mirrored: true,
    };
    const left = landmarkToContainerNorm({ x: 0.1, y: 0.5 }, layout);
    const right = landmarkToContainerNorm({ x: 0.9, y: 0.5 }, { ...layout, mirrored: false });
    expect(left.x).toBeCloseTo(right.x, 1);
  });
});
