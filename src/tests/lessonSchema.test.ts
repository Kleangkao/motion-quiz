import { describe, it, expect } from 'vitest';
import { lessonPackSchema } from '@/storage/schemas';
import { placesAtSchoolLesson } from '@/data/starterLessons';

describe('lessonPackSchema', () => {
  it('validates the starter lesson successfully', () => {
    const result = lessonPackSchema.safeParse(placesAtSchoolLesson);
    expect(result.success).toBe(true);
  });

  it('rejects missing required fields', () => {
    const result = lessonPackSchema.safeParse({ id: 'x', title: 'Test' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid schemaVersion', () => {
    const bad = { ...placesAtSchoolLesson, schemaVersion: 2 };
    const result = lessonPackSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });

  it('rejects invalid correctSide value', () => {
    const bad = {
      ...placesAtSchoolLesson,
      questions: [
        {
          ...placesAtSchoolLesson.questions[0],
          correctSide: 'center',
        },
      ],
    };
    const result = lessonPackSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });

  it('rejects empty questions array', () => {
    const bad = { ...placesAtSchoolLesson, questions: [] };
    const result = lessonPackSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });

  it('accepts optional topic icon', () => {
    const withIcon = {
      ...placesAtSchoolLesson,
      icon: { kind: 'dataUrl' as const, value: 'data:image/png;base64,abc' },
    };
    const result = lessonPackSchema.safeParse(withIcon);
    expect(result.success).toBe(true);
  });
});
