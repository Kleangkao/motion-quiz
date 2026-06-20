import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
  CREATE_TOPIC_DESCRIPTION_PLACEHOLDER,
  CREATE_TOPIC_TITLE_PLACEHOLDER,
  createTopicQuestionPlaceholder,
} from '@/data/createTopicPlaceholders';
import { CreateTopicPage } from '@/routes/CreateTopicPage';

vi.mock('@/storage/lessonStorage', () => ({
  createLesson: vi.fn(),
  getLesson: vi.fn(),
  updateLesson: vi.fn(),
}));

describe('CreateTopicPage placeholders', () => {
  it('shows neutral topic title and optional description fields', () => {
    render(
      <MemoryRouter>
        <CreateTopicPage />
      </MemoryRouter>,
    );

    expect(screen.getByPlaceholderText(CREATE_TOPIC_TITLE_PLACEHOLDER)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(CREATE_TOPIC_DESCRIPTION_PLACEHOLDER)).toBeInTheDocument();
    expect(screen.getByText('Topic subtitle (optional)')).toBeInTheDocument();
  });

  it('uses indexed neutral question placeholders without prefilled values', () => {
    render(
      <MemoryRouter>
        <CreateTopicPage />
      </MemoryRouter>,
    );

    const questionOne = createTopicQuestionPlaceholder(0);
    const questionTwo = createTopicQuestionPlaceholder(1);

    expect(screen.getByPlaceholderText(questionOne.prompt)).toHaveValue('');
    expect(screen.getAllByPlaceholderText(questionOne.correctAnswer)[0]).toHaveValue('');
    expect(screen.getAllByPlaceholderText(questionOne.wrongAnswer)[0]).toHaveValue('');
    expect(screen.getByPlaceholderText(questionTwo.prompt)).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('What is the native token of Solana?')).toBeNull();
    expect(screen.queryByPlaceholderText('SOL')).toBeNull();
    expect(screen.queryByPlaceholderText('ETH')).toBeNull();
  });
});
