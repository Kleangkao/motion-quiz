import { db } from './db';
import type { LessonPack } from './types';
import { STARTER_LESSONS } from '@/data/starterLessons';
import {
  ISLANDDAO_CHALLENGE_ID,
  islanddaoChallengeLesson,
  islandDaoBuiltinContentMatches,
} from '@/data/islanddaoChallengeLesson';
import {
  solanaBasicsLesson,
  solanaBasicsBuiltinMatches,
} from '@/data/solanaBasicsLesson';
import { getLesson } from './lessonStorage';
import {
  mergeStarterLessonMetadata,
  starterLessonMetadataMatches,
} from './starterLessonSync';
import { nowIso } from '@/utils/ids';

export interface StarterLessonMigrationResult {
  /** Built-in lesson IDs inserted this run (missing before, now added) */
  insertedIds: string[];
  /** Built-in lesson IDs refreshed from source this run (content revision sync) */
  updatedIds: string[];
}

function islandDaoPromptsMatch(a: Pick<LessonPack, 'questions'>, b: Pick<LessonPack, 'questions'>): boolean {
  return islandDaoBuiltinContentMatches(a, b);
}

/**
 * Refresh the built-in IslandDAO pack in IndexedDB when question or choice image content changed.
 * Only touches the stable built-in ID; preserves createdAt and user-created topics.
 */
async function syncIslandDaoChallengeBuiltin(): Promise<boolean> {
  const existing = await getLesson(ISLANDDAO_CHALLENGE_ID);
  if (!existing) return false;
  if (islandDaoPromptsMatch(existing, islanddaoChallengeLesson)) return false;

  await db.lessons.put({
    ...islanddaoChallengeLesson,
    createdAt: existing.createdAt,
    updatedAt: nowIso(),
  });
  return true;
}

const SOLANA_BASICS_ID = 'solana-basics';

async function syncSolanaBasicsBuiltin(): Promise<boolean> {
  const existing = await getLesson(SOLANA_BASICS_ID);
  if (!existing) return false;
  if (solanaBasicsBuiltinMatches(existing, solanaBasicsLesson)) return false;

  await db.lessons.put({
    ...solanaBasicsLesson,
    createdAt: existing.createdAt,
    updatedAt: nowIso(),
  });
  return true;
}

/**
 * Refresh Play-safe metadata (title, description, icon) for all built-in starter packs.
 * Preserves saved questions and createdAt — does not touch non-built-in lesson IDs.
 */
async function syncStarterLessonMetadata(): Promise<string[]> {
  const updatedIds: string[] = [];

  for (const canonical of STARTER_LESSONS) {
    const existing = await getLesson(canonical.id);
    if (!existing) continue;
    if (starterLessonMetadataMatches(existing, canonical)) continue;

    await db.lessons.put({
      ...mergeStarterLessonMetadata(existing, canonical),
      updatedAt: nowIso(),
    });
    updatedIds.push(canonical.id);
  }

  return updatedIds;
}

/**
 * Ensure every built-in quiz pack exists in IndexedDB.
 * Inserts missing packs by stable ID only — never overwrites other existing rows
 * (including user-created packs that share a built-in ID).
 * Solana Basics and IslandDAO Challenge also sync when built-in question content changes.
 * All built-in starter packs sync title/description/icon when canonical metadata changes.
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

  const updatedIds: string[] = [];
  if (await syncIslandDaoChallengeBuiltin()) {
    updatedIds.push(ISLANDDAO_CHALLENGE_ID);
  }
  if (await syncSolanaBasicsBuiltin()) {
    updatedIds.push(SOLANA_BASICS_ID);
  }

  for (const id of await syncStarterLessonMetadata()) {
    if (!updatedIds.includes(id)) {
      updatedIds.push(id);
    }
  }

  return { insertedIds, updatedIds };
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
  'ride-market',
  'doublezero',
  'play-solana',
  'star-atlas',
  'monkedao',
] as const;

export type FeaturedPlayPackId = (typeof FEATURED_PLAY_PACK_IDS)[number];

export function isFeaturedPlayPack(lesson: { id: string }): boolean {
  return (FEATURED_PLAY_PACK_IDS as readonly string[]).includes(lesson.id);
}

/** Legacy built-in packs hidden from Play/Home but kept in IndexedDB if already installed. */
export const RETIRED_BUILTIN_PACK_IDS = [
  'starter_places_at_school',
  'seeker_mobile_basics',
] as const;

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
