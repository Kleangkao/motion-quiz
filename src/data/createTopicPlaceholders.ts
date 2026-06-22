export const CREATE_TOPIC_TITLE_PLACEHOLDER = 'e.g. Game Night Quiz';

export const CREATE_TOPIC_DESCRIPTION_PLACEHOLDER =
  'e.g. A quick left/right quiz for friends, events, or classrooms.';

export interface CreateTopicQuestionPlaceholderExample {
  prompt: string;
  correctAnswer: string;
  wrongAnswer: string;
}

export const CREATE_TOPIC_QUESTION_PLACEHOLDERS: readonly CreateTopicQuestionPlaceholderExample[] =
  [
    {
      prompt: 'e.g. Penguins can fly',
      correctAnswer: 'FALSE',
      wrongAnswer: 'TRUE',
    },
    {
      prompt: 'e.g. The Earth is larger than the Moon',
      correctAnswer: 'TRUE',
      wrongAnswer: 'FALSE',
    },
    {
      prompt: 'e.g. Paris is the capital of France',
      correctAnswer: 'TRUE',
      wrongAnswer: 'FALSE',
    },
    {
      prompt: 'e.g. Who directed Titanic?',
      correctAnswer: 'James Cameron',
      wrongAnswer: 'Christopher Nolan',
    },
    {
      prompt: 'e.g. Which planet is called the Red Planet?',
      correctAnswer: 'Mars',
      wrongAnswer: 'Venus',
    },
    {
      prompt: 'e.g. Cats are reptiles',
      correctAnswer: 'FALSE',
      wrongAnswer: 'TRUE',
    },
    {
      prompt: 'e.g. You can share your seed phrase',
      correctAnswer: 'FALSE',
      wrongAnswer: 'TRUE',
    },
    {
      prompt: 'e.g. Star Atlas is a space MMO',
      correctAnswer: 'TRUE',
      wrongAnswer: 'FALSE',
    },
    {
      prompt: 'e.g. Who is the CEO of Star Atlas?',
      correctAnswer: 'Michael Wagner',
      wrongAnswer: 'Anonymous guy',
    },
    {
      prompt: 'e.g. Play Solana has a handheld gaming device',
      correctAnswer: 'TRUE',
      wrongAnswer: 'FALSE',
    },
  ] as const;

export function createTopicQuestionPlaceholder(
  questionIndex: number,
): CreateTopicQuestionPlaceholderExample {
  const pool = CREATE_TOPIC_QUESTION_PLACEHOLDERS;
  return pool[((questionIndex % pool.length) + pool.length) % pool.length]!;
}
