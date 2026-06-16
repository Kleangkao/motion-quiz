import { describe, it, expect } from 'vitest';
import { buildQuestionQueue, shuffleArray } from '@/game/questionEngine';
import type { QuizQuestion } from '@/storage/types';

function makeQuestion(id: string): QuizQuestion {
  return {
    id,
    prompt: `Q${id}`,
    left: { id: `${id}_l`, label: 'Left' },
    right: { id: `${id}_r`, label: 'Right' },
    correctSide: 'left',
  };
}

describe('shuffleArray', () => {
  it('returns same elements', () => {
    const arr = [1, 2, 3, 4, 5];
    const shuffled = shuffleArray(arr);
    expect(shuffled).toHaveLength(arr.length);
    expect(new Set(shuffled)).toEqual(new Set(arr));
  });

  it('does not mutate original', () => {
    const arr = [1, 2, 3];
    const copy = [...arr];
    shuffleArray(arr);
    expect(arr).toEqual(copy);
  });
});

describe('buildQuestionQueue', () => {
  const qs = [makeQuestion('a'), makeQuestion('b'), makeQuestion('c')];

  it('returns each question once in sequential mode', () => {
    const queue = buildQuestionQueue(qs, 'sequential', 120);
    expect(queue).toHaveLength(3);
    expect(queue.map((q) => q.id)).toEqual(['a', 'b', 'c']);
  });

  it('returns empty for empty input', () => {
    expect(buildQuestionQueue([], 'random', 120)).toHaveLength(0);
  });

  it('does not repeat questions to fill duration', () => {
    const queue = buildQuestionQueue([makeQuestion('a'), makeQuestion('b')], 'sequential', 120);
    expect(queue).toHaveLength(2);
    expect(queue.map((q) => q.id)).toEqual(['a', 'b']);
  });

  it('random mode includes every question exactly once', () => {
    const queue = buildQuestionQueue(qs, 'random', 120);
    expect(queue).toHaveLength(3);
    expect(new Set(queue.map((q) => q.id))).toEqual(new Set(['a', 'b', 'c']));
  });
});
