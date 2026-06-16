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

/** Built-in packs surfaced on the main Play screen (includes IslandDAO). */
export const FEATURED_PLAY_PACK_IDS = [
  'solana-basics',
  'islanddao-challenge',
  'seeker_mobile_basics',
] as const;

export type FeaturedPlayPackId = (typeof FEATURED_PLAY_PACK_IDS)[number];

export function isFeaturedPlayPack(lesson: { id: string }): boolean {
  return (FEATURED_PLAY_PACK_IDS as readonly string[]).includes(lesson.id);
}

/** Legacy built-in packs hidden from Play/Home but kept in IndexedDB if already installed. */
export const RETIRED_BUILTIN_PACK_IDS = ['starter_places_at_school'] as const;

export function isRetiredBuiltinPack(lesson: { id: string }): boolean {
  return (RETIRED_BUILTIN_PACK_IDS as readonly string[]).includes(lesson.id);
}

export function isVisibleInPlay(lesson: { id: string }): boolean {
  return !isRetiredBuiltinPack(lesson);
}

export function playStateForLesson(lesson: {
  id: string;
  title: string;
  packKind?: string;
  challengeId?: string;
}) {
  if (lesson.packKind === 'challenge') {
    return {
      playMode: 'challenge' as const,
      challengeId: lesson.challengeId ?? lesson.id,
      challengeName: lesson.title,
    };
  }
  return { playMode: 'solo' as const };
}
