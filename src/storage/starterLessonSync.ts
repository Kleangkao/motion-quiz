import type { LessonImageRef, LessonPack } from './types';
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

/** Refresh title/description/icon on a saved built-in pack without touching questions. */
export function mergeStarterLessonMetadata(existing: LessonPack, canonical: LessonPack): LessonPack {
  return {
    ...existing,
    title: canonical.title,
    description: canonical.description,
    icon: canonical.icon,
  };
}
