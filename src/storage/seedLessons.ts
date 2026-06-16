import { db } from './db';
import { STARTER_LESSONS } from '@/data/starterLessons';
import { getLesson } from './lessonStorage';

export interface StarterLessonMigrationResult {
  /** Built-in lesson IDs inserted this run (missing before, now added) */
  insertedIds: string[];
}

/**
 * Ensure every built-in quiz pack exists in IndexedDB.
 * Inserts missing packs by stable ID only — never overwrites existing rows
 * (including user-edited packs that share a built-in ID).
 */
export async function ensureStarterLessons(): Promise<StarterLessonMigrationResult> {
  const insertedIds: string[] = [];

  for (const lesson of STARTER_LESSONS) {
    const existing = await getLesson(lesson.id);
    if (!existing) {
      await db.lessons.put(lesson);
      insertedIds.push(lesson.id);
    }
  }

  return { insertedIds };
}

export function isChallengePack(lesson: { packKind?: string }): boolean {
  return lesson.packKind === 'challenge';
}

export function isSoloPack(lesson: { packKind?: string; id: string }): boolean {
  return lesson.packKind !== 'challenge';
}
