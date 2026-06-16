import { db } from './db';
import type { ResultSession } from './types';

export async function saveResultSession(result: ResultSession): Promise<void> {
  await db.results.add(result);
}

export async function listResultSessions(lessonId?: string): Promise<ResultSession[]> {
  const all = await db.results.orderBy('startedAt').reverse().toArray();
  if (lessonId) return all.filter((s) => s.lessonId === lessonId);
  return all;
}

export async function getResultSession(id: string): Promise<ResultSession | undefined> {
  return db.results.get(id);
}

export async function updateResultSession(
  id: string,
  patch: Partial<ResultSession>,
): Promise<void> {
  const existing = await getResultSession(id);
  if (!existing) return;
  await db.results.put({ ...existing, ...patch });
}

export async function deleteResultSession(id: string): Promise<void> {
  await db.results.delete(id);
}

export async function clearResults(): Promise<void> {
  await db.results.clear();
}
