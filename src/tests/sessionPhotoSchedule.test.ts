import { describe, expect, it } from 'vitest';
import {
  resolvePostFeedbackPhotoAction,
  scheduledPhotoSlotCount,
  shouldCaptureAfterAnswer,
} from '@/game/sessionPhotoSchedule';

describe('sessionPhotoSchedule', () => {
  it('captures after every 2 answers, not at round start', () => {
    expect(shouldCaptureAfterAnswer(0, 8)).toBe(false);
    expect(shouldCaptureAfterAnswer(1, 8)).toBe(true);
    expect(shouldCaptureAfterAnswer(3, 8)).toBe(true);
    expect(shouldCaptureAfterAnswer(5, 8)).toBe(true);
    expect(shouldCaptureAfterAnswer(7, 8)).toBe(false);
  });

  it('captures on final answer only when the round has 2 questions', () => {
    expect(shouldCaptureAfterAnswer(0, 2)).toBe(false);
    expect(shouldCaptureAfterAnswer(1, 2)).toBe(true);
    expect(resolvePostFeedbackPhotoAction(1, 2)).toBe('photo-then-finish');
  });

  it('does not capture on final answer for longer rounds', () => {
    expect(shouldCaptureAfterAnswer(3, 4)).toBe(false);
    expect(resolvePostFeedbackPhotoAction(3, 4)).toBe('finish');
  });

  it('resolves photo-then-next on even counts mid-round', () => {
    expect(resolvePostFeedbackPhotoAction(1, 8)).toBe('photo-then-next');
    expect(resolvePostFeedbackPhotoAction(2, 8)).toBe('next');
  });

  it('counts scheduled photo slots', () => {
    expect(scheduledPhotoSlotCount(2)).toBe(1);
    expect(scheduledPhotoSlotCount(3)).toBe(1);
    expect(scheduledPhotoSlotCount(4)).toBe(1);
    expect(scheduledPhotoSlotCount(8)).toBe(3);
  });
});
