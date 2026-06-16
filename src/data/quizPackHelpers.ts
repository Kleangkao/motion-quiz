import type { LessonPack, QuizQuestion } from '@/storage/types';

/** Build a two-choice question for the left/right gesture engine */
export function twoChoice(
  id: string,
  prompt: string,
  correctLabel: string,
  wrongLabel: string,
  correctSide: 'left' | 'right',
  tags?: string[],
  explanation?: string,
): QuizQuestion {
  const correct = { id: `${id}_correct`, label: correctLabel };
  const wrong = { id: `${id}_wrong`, label: wrongLabel };
  return {
    id,
    prompt,
    left: correctSide === 'left' ? correct : wrong,
    right: correctSide === 'right' ? correct : wrong,
    correctSide,
    explanation,
    difficulty: 'easy',
    tags,
  };
}

export function alternateSides(count: number): ('left' | 'right')[] {
  return Array.from({ length: count }, (_, i) => (i % 2 === 0 ? 'left' : 'right'));
}

export function basePack(
  id: string,
  title: string,
  description: string,
  packKind: 'solo' | 'challenge',
  questionCount: number,
  challengeId?: string,
): Omit<LessonPack, 'questions'> {
  return {
    id,
    schemaVersion: 1,
    title,
    description,
    languagePair: 'en',
    durationSeconds: Math.max(120, questionCount * 15),
    questionOrder: 'random',
    showAnswerTextAfterResponse: true,
    allowTouchFallback: false,
    packKind,
    challengeId: challengeId ?? (packKind === 'challenge' ? id : undefined),
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
  };
}
