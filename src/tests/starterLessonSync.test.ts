import { describe, expect, it } from 'vitest';
import { doublezeroLesson } from '@/data/doublezeroLesson';
import { rideMarketLesson } from '@/data/rideMarketLesson';
import { STARTER_LESSONS } from '@/data/starterLessons';
import {
  mergeStarterLessonContent,
  starterLessonContentMatches,
} from '@/storage/starterLessonSync';

describe('starterLessonSync', () => {
  it('detects question prompt mismatches for built-in packs', () => {
    const saved = {
      ...doublezeroLesson,
      questions: [
        {
          ...doublezeroLesson.questions[0],
          prompt: 'Legacy DoubleZero prompt',
        },
      ],
    };

    expect(starterLessonContentMatches(saved, doublezeroLesson)).toBe(false);
  });

  it('preserves createdAt when merging canonical built-in content', () => {
    const saved = {
      ...rideMarketLesson,
      createdAt: '2024-06-01T00:00:00.000Z',
      description: 'Old description',
    };

    expect(mergeStarterLessonContent(saved, rideMarketLesson)).toEqual({
      ...rideMarketLesson,
      createdAt: '2024-06-01T00:00:00.000Z',
    });
  });

  it('matches all canonical starter lessons when saved content is identical', () => {
    for (const canonical of STARTER_LESSONS) {
      expect(starterLessonContentMatches(canonical, canonical)).toBe(true);
    }
  });
});
