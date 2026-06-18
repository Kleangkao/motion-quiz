import { z } from 'zod';

export const lessonImageRefSchema = z.object({
  kind: z.enum(['asset', 'indexeddb', 'dataUrl', 'external']),
  value: z.string().min(1),
});

export const quizChoiceSchema = z.object({
  id: z.string().min(1),
  label: z.string().optional(),
  image: lessonImageRefSchema.optional(),
  altText: z.string().optional(),
});

export const quizQuestionSchema = z.object({
  id: z.string().min(1),
  prompt: z.string().min(1),
  promptLanguage: z.string().optional(),
  answerText: z.string().optional(),
  explanation: z.string().optional(),
  left: quizChoiceSchema,
  right: quizChoiceSchema,
  correctSide: z.enum(['left', 'right']),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  tags: z.array(z.string()).optional(),
});

export const lessonPackSchema = z.object({
  id: z.string().min(1),
  schemaVersion: z.literal(1),
  title: z.string().min(1),
  description: z.string().optional(),
  languagePair: z.string().optional(),
  durationSeconds: z.number().int().min(10).max(3600),
  questionOrder: z.enum(['random', 'sequential']),
  showAnswerTextAfterResponse: z.boolean(),
  allowTouchFallback: z.boolean(),
  packKind: z.enum(['solo', 'challenge']).optional(),
  challengeId: z.string().optional(),
  icon: lessonImageRefSchema.optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  questions: z.array(quizQuestionSchema).min(1),
});

export type LessonPackInput = z.input<typeof lessonPackSchema>;
