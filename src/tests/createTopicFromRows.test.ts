import { describe, expect, it } from 'vitest';
import { buildQuestionsFromTopicRows, topicRowsFromQuestions } from '@/data/createTopicFromRows';

describe('buildQuestionsFromTopicRows', () => {
  it('builds alternating left/right correct sides', () => {
    const questions = buildQuestionsFromTopicRows([
      { prompt: 'Q1', correctAnswer: 'A', wrongAnswer: 'B' },
      { prompt: 'Q2', correctAnswer: 'C', wrongAnswer: 'D' },
    ]);
    expect(questions).toHaveLength(2);
    expect(questions[0].correctSide).toBe('left');
    expect(questions[1].correctSide).toBe('right');
    expect(questions[0].left.label).toBe('A');
    expect(questions[0].right.label).toBe('B');
  });

  it('attaches optional images to correct and wrong choices', () => {
    const correctImage = { kind: 'dataUrl' as const, value: 'data:image/png;base64,correct' };
    const wrongImage = { kind: 'dataUrl' as const, value: 'data:image/png;base64,wrong' };
    const [q] = buildQuestionsFromTopicRows([
      {
        prompt: 'Pick SOL',
        correctAnswer: 'SOL',
        wrongAnswer: 'BTC',
        correctImage,
        wrongImage,
      },
    ]);
    expect(q.left.image).toEqual(correctImage);
    expect(q.right.image).toEqual(wrongImage);
  });

  it('round-trips questions back to topic rows for editing', () => {
    const correctImage = { kind: 'dataUrl' as const, value: 'data:image/png;base64,correct' };
    const wrongImage = { kind: 'dataUrl' as const, value: 'data:image/png;base64,wrong' };
    const rows = [
      { prompt: 'Q1', correctAnswer: 'A', wrongAnswer: 'B', correctImage, wrongImage },
      { prompt: 'Q2', correctAnswer: 'C', wrongAnswer: 'D' },
    ];
    const questions = buildQuestionsFromTopicRows(rows);
    expect(topicRowsFromQuestions(questions)).toEqual(rows);
  });
});
