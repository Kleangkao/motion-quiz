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

  it('returns at least the lesson questions count', () => {
    const queue = buildQuestionQueue(qs, 'sequential', 60);
    expect(queue.length).toBeGreaterThanOrEqual(qs.length);
  });

  it('returns empty for empty input', () => {
    expect(buildQuestionQueue([], 'random', 120)).toHaveLength(0);
  });

  it('sequential mode preserves order within a cycle', () => {
    const queue = buildQuestionQueue(qs, 'sequential', 120);
    // First cycle should be a-b-c
    expect(queue[0].id).toBe('a');
    expect(queue[1].id).toBe('b');
    expect(queue[2].id).toBe('c');
  });

  it('covers enough questions for duration', () => {
    const queue = buildQuestionQueue(qs, 'random', 120);
    // At ~6s per question, need at least 20 for 120s
    expect(queue.length).toBeGreaterThanOrEqual(20);
  });
});
