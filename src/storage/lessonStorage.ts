import { db } from './db';
import type { LessonPack, QuizQuestion } from './types';
import { lessonPackSchema } from './schemas';
import { generateId, nowIso } from '@/utils/ids';
import { downloadJson } from '@/utils/json';
import { AppError } from '@/utils/errors';

export async function listLessons(): Promise<LessonPack[]> {
  return db.lessons.orderBy('updatedAt').reverse().toArray();
}

export async function getLesson(id: string): Promise<LessonPack | undefined> {
  return db.lessons.get(id);
}

export async function createLesson(
  input: Omit<LessonPack, 'id' | 'schemaVersion' | 'createdAt' | 'updatedAt'>,
): Promise<LessonPack> {
  const now = nowIso();
  const lesson: LessonPack = {
    ...input,
    id: generateId(),
    schemaVersion: 1,
    createdAt: now,
    updatedAt: now,
  };
  await db.lessons.add(lesson);
  return lesson;
}

export async function updateLesson(
  id: string,
  patch: Partial<Omit<LessonPack, 'id' | 'schemaVersion' | 'createdAt'>>,
): Promise<void> {
  await db.lessons.update(id, { ...patch, updatedAt: nowIso() });
}

export async function deleteLesson(id: string): Promise<void> {
  await db.lessons.delete(id);
}

export async function duplicateLesson(id: string): Promise<LessonPack> {
  const original = await getLesson(id);
  if (!original) throw new AppError('Lesson not found', 'NOT_FOUND');
  const now = nowIso();
  const copy: LessonPack = {
    ...original,
    id: generateId(),
    title: `${original.title} (copy)`,
    questions: original.questions.map((q) => ({
      ...q,
      id: generateId(),
      left: { ...q.left, id: generateId() },
      right: { ...q.right, id: generateId() },
    })),
    createdAt: now,
    updatedAt: now,
  };
  await db.lessons.add(copy);
  return copy;
}

export async function importLesson(json: unknown): Promise<LessonPack> {
  const result = lessonPackSchema.safeParse(json);
  if (!result.success) {
    const issues = result.error.issues ?? [];
    const msg = issues.map((e) => `${e.path.map(String).join('.')}: ${e.message}`).join('; ');
    throw new AppError(`Invalid lesson format: ${msg}`, 'VALIDATION_ERROR');
  }
  const lesson = result.data as LessonPack;
  // Check if lesson with same ID already exists — regenerate ID if so
  const existing = await getLesson(lesson.id);
  if (existing) {
    lesson.id = generateId();
  }
  await db.lessons.put(lesson);
  return lesson;
}

export async function exportLesson(id: string): Promise<void> {
  const lesson = await getLesson(id);
  if (!lesson) throw new AppError('Lesson not found', 'NOT_FOUND');
  const filename = `${lesson.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
  downloadJson(lesson, filename);
}

export async function exportAllLessons(): Promise<void> {
  const lessons = await listLessons();
  downloadJson({ lessons, exportedAt: nowIso() }, 'all_lessons.json');
}

export async function importAllLessons(
  json: unknown,
): Promise<{ imported: number; errors: string[] }> {
  const errors: string[] = [];
  let imported = 0;

  const parseMulti = (data: unknown): unknown[] => {
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object' && 'lessons' in data && Array.isArray((data as {lessons: unknown[]}).lessons)) {
      return (data as { lessons: unknown[] }).lessons;
    }
    return [data];
  };

  for (const item of parseMulti(json)) {
    try {
      await importLesson(item);
      imported++;
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e));
    }
  }
  return { imported, errors };
}

export function addQuestion(lesson: LessonPack, question: QuizQuestion): LessonPack {
  return { ...lesson, questions: [...lesson.questions, question], updatedAt: nowIso() };
}

export function updateQuestion(lesson: LessonPack, question: QuizQuestion): LessonPack {
  return {
    ...lesson,
    questions: lesson.questions.map((q) => (q.id === question.id ? question : q)),
    updatedAt: nowIso(),
  };
}

export function removeQuestion(lesson: LessonPack, questionId: string): LessonPack {
  return {
    ...lesson,
    questions: lesson.questions.filter((q) => q.id !== questionId),
    updatedAt: nowIso(),
  };
}

export function reorderQuestions(lesson: LessonPack, fromIdx: number, toIdx: number): LessonPack {
  const questions = [...lesson.questions];
  const [moved] = questions.splice(fromIdx, 1);
  questions.splice(toIdx, 0, moved);
  return { ...lesson, questions, updatedAt: nowIso() };
}
