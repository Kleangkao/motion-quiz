import { describe, it, expect } from 'vitest';
import {
  getGestureStatusMessage,
  getGestureRejectionDebugDetail,
} from '@/vision/gestureStatusMessages';
import { createEmptyDiagnostics } from '@/vision/detectionTypes';
import type { GestureSelectorOutput } from '@/vision/types';

const baseDiag = () => ({
  ...createEmptyDiagnostics(),
  cameraStatus: 'ready' as const,
  poseModelStatus: 'ready' as const,
  handModelStatus: 'ready' as const,
});

describe('getGestureStatusMessage', () => {
  it('covers near_body', () => {
    const msg = getGestureStatusMessage(
      { confidence: 0, holdProgress: 0, reason: 'near_body' },
      baseDiag(),
      true,
    );
    expect(msg.text).toContain('Extend your arm');
  });

  it('covers neutral_zone', () => {
    const msg = getGestureStatusMessage(
      { confidence: 0, holdProgress: 0, reason: 'neutral_zone' },
      baseDiag(),
      true,
    );
    expect(msg.text).toContain('center does not count');
  });

  it('covers ambiguous', () => {
    const msg = getGestureStatusMessage(
      { confidence: 0, holdProgress: 0, reason: 'ambiguous' },
      baseDiag(),
      true,
    );
    expect(msg.text).toContain('more clearly');
  });

  it('covers cooldown', () => {
    const msg = getGestureStatusMessage(
      { confidence: 0, holdProgress: 0, reason: 'cooldown' },
      baseDiag(),
      true,
    );
    expect(msg.text).toContain('locked');
  });

  it('covers wrong_side', () => {
    const msg = getGestureStatusMessage(
      { confidence: 0, holdProgress: 0, reason: 'wrong_side' },
      baseDiag(),
      true,
    );
    expect(msg.text).toContain('Wrong card');
  });

  it('covers no_candidate', () => {
    const msg = getGestureStatusMessage(
      { confidence: 0, holdProgress: 0, reason: 'no_candidate' },
      { ...baseDiag(), personDetected: false },
      true,
    );
    expect(msg.text).toContain('Show your hand');
  });

  it('shows hold progress during grace', () => {
    const msg = getGestureStatusMessage(
      { confidence: 0, holdProgress: 0.45, candidateSide: 'left', reason: 'grace' },
      baseDiag(),
      true,
    );
    expect(msg.text).toContain('Hold on LEFT');
    expect(msg.text).toContain('45%');
  });
});

describe('getGestureRejectionDebugDetail', () => {
  it('returns debug detail for rejections', () => {
    const detail = getGestureRejectionDebugDetail({
      confidence: 0,
      holdProgress: 0,
      reason: 'wrong_side',
      debug: { pointingAt: 'right' },
    } as GestureSelectorOutput);
    expect(detail).toContain('wrong_side');
    expect(detail).toContain('pointing=right');
  });

  it('returns null for active hold states', () => {
    expect(
      getGestureRejectionDebugDetail({
        confidence: 1,
        holdProgress: 0.5,
        reason: 'holding',
      }),
    ).toBeNull();
  });
});
