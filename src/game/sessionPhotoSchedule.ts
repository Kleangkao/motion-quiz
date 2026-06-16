export type PhotoResumeMode = 'continue' | 'next' | 'finish';

export type PostFeedbackPhotoAction =
  | 'photo-then-finish'
  | 'photo-then-next'
  | 'next'
  | 'finish';

/**
 * Photo after every 2 completed questions — not at round start.
 * No photo on the final question unless the round has exactly 2 questions.
 */
export function shouldCaptureAfterAnswer(
  answeredIndex: number,
  totalQuestions: number,
): boolean {
  if (totalQuestions <= 0) return false;
  const answeredCount = answeredIndex + 1;
  const isFinal = answeredIndex === totalQuestions - 1;
  if (totalQuestions === 2 && isFinal) return true;
  if (isFinal) return false;
  return answeredCount % 2 === 0;
}

export function resolvePostFeedbackPhotoAction(
  answeredIndex: number,
  totalQuestions: number,
): PostFeedbackPhotoAction {
  const isFinal = answeredIndex === totalQuestions - 1;

  if (shouldCaptureAfterAnswer(answeredIndex, totalQuestions)) {
    return isFinal ? 'photo-then-finish' : 'photo-then-next';
  }
  if (isFinal) return 'finish';
  return 'next';
}

export function scheduledPhotoSlotCount(totalQuestions: number): number {
  if (totalQuestions <= 0) return 0;
  let count = 0;
  for (let i = 0; i < totalQuestions; i++) {
    if (shouldCaptureAfterAnswer(i, totalQuestions)) count++;
  }
  return count;
}

/** @deprecated Pre-start photos removed; always false. */
export function shouldCaptureBeforeQuestion(
  _questionIndex: number,
  _totalQuestions: number,
): boolean {
  return false;
}

/** @deprecated Mid-game index helper kept for tests migrating off old schedule. */
export function getMidGameBeforeQuestionIndex(totalQuestions: number): number | null {
  if (totalQuestions < 4) return null;
  return Math.floor(totalQuestions / 2) - 1;
}

/** @deprecated Final-only capture replaced by shouldCaptureAfterAnswer. */
export function shouldCaptureAfterFinalAnswer(
  answeredIndex: number,
  totalQuestions: number,
): boolean {
  return shouldCaptureAfterAnswer(answeredIndex, totalQuestions) && answeredIndex === totalQuestions - 1;
}
