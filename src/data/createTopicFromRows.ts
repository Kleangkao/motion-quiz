import type { LessonImageRef, QuizQuestion } from '@/storage/types';
import { alternateSides, twoChoice } from '@/data/quizPackHelpers';
import { generateId } from '@/utils/ids';

export interface TopicQuestionRow {
  prompt: string;
  correctAnswer: string;
  wrongAnswer: string;
  /** Optional image on the correct answer choice (local data URL). */
  correctImage?: LessonImageRef;
  /** Optional image on the wrong answer choice (local data URL). */
  wrongImage?: LessonImageRef;
}

export function topicRowsFromQuestions(questions: QuizQuestion[]): TopicQuestionRow[] {
  return questions.map((q) => {
    const correct = q.correctSide === 'left' ? q.left : q.right;
    const wrong = q.correctSide === 'left' ? q.right : q.left;
    return {
      prompt: q.prompt,
      correctAnswer: correct.label ?? correct.altText ?? '',
      wrongAnswer: wrong.label ?? wrong.altText ?? '',
      correctImage: correct.image,
      wrongImage: wrong.image,
    };
  });
}

export function buildQuestionsFromTopicRows(rows: TopicQuestionRow[]): QuizQuestion[] {
  const sides = alternateSides(rows.length);
  return rows.map((row, index) => {
    const questionId = generateId();
    const question = twoChoice(
      questionId,
      row.prompt.trim(),
      row.correctAnswer.trim(),
      row.wrongAnswer.trim(),
      sides[index],
    );
    const correctChoice = sides[index] === 'left' ? question.left : question.right;
    const wrongChoice = sides[index] === 'left' ? question.right : question.left;
    if (row.correctImage) {
      correctChoice.image = row.correctImage;
      correctChoice.altText = row.correctAnswer.trim();
    }
    if (row.wrongImage) {
      wrongChoice.image = row.wrongImage;
      wrongChoice.altText = row.wrongAnswer.trim();
    }
    return question;
  });
}
