import { describe, expect, it } from 'vitest';
import {
  CREATE_TOPIC_DESCRIPTION_PLACEHOLDER,
  CREATE_TOPIC_QUESTION_PLACEHOLDERS,
  CREATE_TOPIC_TITLE_PLACEHOLDER,
  createTopicQuestionPlaceholder,
} from '@/data/createTopicPlaceholders';

describe('createTopicPlaceholders', () => {
  it('uses neutral topic title and description placeholders', () => {
    expect(CREATE_TOPIC_TITLE_PLACEHOLDER).toBe('e.g. Game Night Quiz');
    expect(CREATE_TOPIC_DESCRIPTION_PLACEHOLDER).toBe(
      'e.g. A quick left/right quiz for friends, events, or classrooms.',
    );
  });

  it('assigns question placeholders by index and cycles after ten', () => {
    expect(createTopicQuestionPlaceholder(0).prompt).toBe('e.g. Penguins can fly');
    expect(createTopicQuestionPlaceholder(1).prompt).toBe('e.g. The Earth is larger than the Moon');
    expect(createTopicQuestionPlaceholder(9).prompt).toBe(
      'e.g. Play Solana has a handheld gaming device',
    );
    expect(createTopicQuestionPlaceholder(10)).toEqual(createTopicQuestionPlaceholder(0));
    expect(CREATE_TOPIC_QUESTION_PLACEHOLDERS).toHaveLength(10);
  });

  it('does not use old Solana-specific question placeholders', () => {
    const prompts = CREATE_TOPIC_QUESTION_PLACEHOLDERS.map((example) => example.prompt);
    const correctAnswers = CREATE_TOPIC_QUESTION_PLACEHOLDERS.map((example) => example.correctAnswer);
    const wrongAnswers = CREATE_TOPIC_QUESTION_PLACEHOLDERS.map((example) => example.wrongAnswer);

    expect(prompts).not.toContain('What is the native token of Solana?');
    expect(correctAnswers).not.toContain('SOL');
    expect(wrongAnswers).not.toContain('ETH');
  });
});
