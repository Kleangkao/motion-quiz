import { db } from './db';
import { STARTER_LESSONS } from '@/data/starterLessons';
import { getLesson } from './lessonStorage';

/** Ensure built-in quiz packs exist without overwriting user edits */
export async function ensureStarterLessons(): Promise<void> {
  for (const lesson of STARTER_LESSONS) {
    const existing = await getLesson(lesson.id);
    if (!existing) {
      await db.lessons.put(lesson);
    }
  }
}

export function isChallengePack(lesson: { packKind?: string }): boolean {
  return lesson.packKind === 'challenge';
}

export function isSoloPack(lesson: { packKind?: string; id: string }): boolean {
  return lesson.packKind !== 'challenge';
}
