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
 * One playthrough: each lesson question appears once (shuffled or in order).
 * The game timer still caps total time; questions are not repeated to fill duration.
 */
export function buildQuestionQueue(
  questions: QuizQuestion[],
  order: 'random' | 'sequential',
  _durationSeconds?: number,
): QuizQuestion[] {
  if (questions.length === 0) return [];
  return order === 'random' ? shuffleArray(questions) : [...questions];
}
