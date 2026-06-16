import type { LessonImageRef, LessonPack, QuizQuestion } from '@/storage/types';
import { alternateSides, basePack, twoChoice } from './quizPackHelpers';

export const ISLANDDAO_CHALLENGE_ID = 'islanddao-challenge';

const sides = alternateSides(5);

function islanddaoAsset(filename: string): LessonImageRef {
  return { kind: 'external', value: `/quiz-assets/islanddao/${filename}` };
}

function attachChoiceImages(
  question: QuizQuestion,
  images: { correct?: LessonImageRef; wrong?: LessonImageRef },
): QuizQuestion {
  const correctChoice = question.correctSide === 'left' ? question.left : question.right;
  const wrongChoice = question.correctSide === 'left' ? question.right : question.left;

  const withImage = (choice: typeof question.left, image?: LessonImageRef, alt?: string) =>
    image ? { ...choice, image, altText: alt ?? choice.label } : choice;

  return {
    ...question,
    left:
      question.left.id === correctChoice.id
        ? withImage(question.left, images.correct, question.left.label)
        : question.left.id === wrongChoice.id
          ? withImage(question.left, images.wrong, question.left.label)
          : question.left,
    right:
      question.right.id === correctChoice.id
        ? withImage(question.right, images.correct, question.right.label)
        : question.right.id === wrongChoice.id
          ? withImage(question.right, images.wrong, question.right.label)
          : question.right,
  };
}

const baseQuestions: QuizQuestion[] = [
  twoChoice(
    'islanddao_q01',
    'What is IslandDAO?',
    'A Network State of Web3 power users where community comes first',
    'A short-term crypto trading group',
    sides[0],
    ['islanddao', 'community'],
  ),
  twoChoice(
    'islanddao_q02',
    'IslandDAO V4 takes place at which location?',
    'Villa Solana, Koh Samui, Thailand',
    'A conference hall in Singapore',
    sides[1],
    ['islanddao', 'thailand', 'v4'],
  ),
  twoChoice(
    'islanddao_q03',
    'What is the IslandHack prize pool?',
    '$10,000 USDC',
    '$100 in guaranteed rewards',
    sides[2],
    ['islanddao', 'islandhack'],
  ),
  twoChoice(
    'islanddao_q04',
    'Where and when is IslandDAO V5 planned?',
    'Florianópolis, Brazil, Oct-Nov 2026',
    'Dubai, UAE, Dec 2026',
    sides[3],
    ['islanddao', 'brazil', 'v5'],
  ),
  twoChoice(
    'islanddao_q05',
    'What does an IslandDAO NFT unlock?',
    'Community access, events, governance, and member perks',
    'Automatic profit sharing from every event',
    sides[4],
    ['islanddao', 'nft'],
  ),
];

export const islanddaoChallengeLesson: LessonPack = {
  ...basePack(
    ISLANDDAO_CHALLENGE_ID,
    'IslandDAO Challenge',
    'Five quick questions on IslandDAO, IslandHack, and the V4 and V5 community stops.',
    'challenge',
    5,
    ISLANDDAO_CHALLENGE_ID,
  ),
  questions: [
    baseQuestions[0],
    attachChoiceImages(baseQuestions[1], {
      correct: islanddaoAsset('koh-samui.jpg'),
      wrong: islanddaoAsset('singapore-conference-hall.jpg'),
    }),
    baseQuestions[2],
    attachChoiceImages(baseQuestions[3], {
      correct: islanddaoAsset('brazil.jpg'),
      wrong: islanddaoAsset('dubai.jpg'),
    }),
    attachChoiceImages(baseQuestions[4], {
      correct: islanddaoAsset('nft-islanddao.png'),
      wrong: islanddaoAsset('nft-fake-rares.png'),
    }),
  ],
};

/** Compare built-in IslandDAO question prompts for idempotent IndexedDB sync. */
export function islandDaoQuestionPrompts(lesson: Pick<LessonPack, 'questions'>): string[] {
  return lesson.questions.map((q) => q.prompt);
}

/** Choice image paths (left then right per question) for built-in sync fingerprinting. */
export function islandDaoChoiceImagePaths(lesson: Pick<LessonPack, 'questions'>): string[] {
  return lesson.questions.flatMap((q) => [q.left.image?.value ?? '', q.right.image?.value ?? '']);
}

export function islandDaoBuiltinContentMatches(
  a: Pick<LessonPack, 'questions'>,
  b: Pick<LessonPack, 'questions'>,
): boolean {
  const promptsMatch =
    islandDaoQuestionPrompts(a).length === islandDaoQuestionPrompts(b).length &&
    islandDaoQuestionPrompts(a).every((prompt, i) => prompt === islandDaoQuestionPrompts(b)[i]);
  if (!promptsMatch) return false;
  const aPaths = islandDaoChoiceImagePaths(a);
  const bPaths = islandDaoChoiceImagePaths(b);
  return aPaths.length === bPaths.length && aPaths.every((path, i) => path === bPaths[i]);
}
