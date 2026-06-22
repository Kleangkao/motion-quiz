import type { LessonImageRef, LessonPack, QuizChoice, QuizQuestion } from './types';
import { STARTER_LESSONS } from '@/data/starterLessons';

/** Stable built-in starter lesson IDs seeded from canonical pack data. */
export const BUILTIN_STARTER_LESSON_IDS = STARTER_LESSONS.map((lesson) => lesson.id);

const STARTER_LESSON_BY_ID = new Map(STARTER_LESSONS.map((lesson) => [lesson.id, lesson]));

export function isBuiltinStarterLessonId(id: string): boolean {
  return STARTER_LESSON_BY_ID.has(id);
}

export function canonicalStarterLesson(id: string): LessonPack | undefined {
  return STARTER_LESSON_BY_ID.get(id);
}

function iconsMatch(a?: LessonImageRef, b?: LessonImageRef): boolean {
  if (a === undefined && b === undefined) return true;
  if (a === undefined || b === undefined) return false;
  return a.kind === b.kind && a.value === b.value;
}

/** Whether Play-safe metadata on a saved built-in pack matches canonical starter data. */
export function starterLessonMetadataMatches(existing: LessonPack, canonical: LessonPack): boolean {
  return (
    existing.title === canonical.title &&
    existing.description === canonical.description &&
    iconsMatch(existing.icon, canonical.icon)
  );
}

function choiceFingerprint(choice: QuizChoice): string {
  const image = choice.image;
  return [
    choice.id,
    choice.label ?? '',
    choice.altText ?? '',
    image?.kind ?? '',
    image?.value ?? '',
  ].join('|');
}

function questionFingerprint(question: QuizQuestion): string {
  return [
    question.id,
    question.prompt,
    question.correctSide,
    choiceFingerprint(question.left),
    choiceFingerprint(question.right),
  ].join('||');
}

/** Whether saved built-in pack content matches canonical starter data. */
export function starterLessonContentMatches(existing: LessonPack, canonical: LessonPack): boolean {
  if (!starterLessonMetadataMatches(existing, canonical)) return false;
  if (existing.questions.length !== canonical.questions.length) return false;
  return existing.questions.every(
    (question, index) =>
      questionFingerprint(question) === questionFingerprint(canonical.questions[index]),
  );
}

/** Refresh canonical built-in content while preserving safe local fields. */
export function mergeStarterLessonContent(existing: LessonPack, canonical: LessonPack): LessonPack {
  return {
    ...canonical,
    createdAt: existing.createdAt,
  };
}
