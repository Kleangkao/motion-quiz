import type { QuizQuestion } from '@/storage/types';

export function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Build an infinite question queue by cycling through the lesson questions.
 * For `random` mode, shuffle each cycle.
 * We generate enough questions to fill the duration (at ~6s per question).
 */
export function buildQuestionQueue(
  questions: QuizQuestion[],
  order: 'random' | 'sequential',
  durationSeconds: number,
): QuizQuestion[] {
  if (questions.length === 0) return [];
  const approxNeeded = Math.max(questions.length, Math.ceil(durationSeconds / 6));
  const queue: QuizQuestion[] = [];
  while (queue.length < approxNeeded) {
    const cycle = order === 'random' ? shuffleArray(questions) : [...questions];
    queue.push(...cycle);
  }
  return queue.slice(0, approxNeeded);
}
