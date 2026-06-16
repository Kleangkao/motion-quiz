import type { LessonPack } from '@/storage/types';

/**
 * "Places at School" starter lesson.
 * Uses SVG placeholder images so no external assets are required.
 * Each question shows the English word as the prompt; the correct side
 * shows the school-place image, the wrong side shows a decoy.
 */

function placeholderSvg(emoji: string, label: string, bg: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
  <rect width="200" height="200" rx="20" fill="${bg}"/>
  <text x="100" y="100" font-size="72" text-anchor="middle" dominant-baseline="central">${emoji}</text>
  <text x="100" y="168" font-size="18" font-family="sans-serif" text-anchor="middle" fill="#fff" font-weight="bold">${label}</text>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const places = [
  { en: 'Gym', th: 'โรงยิม', emoji: '🏋️', bg: '#6366f1', decoyEmoji: '📚', decoyLabel: 'Library', decayBg: '#0891b2' },
  { en: 'Library', th: 'ห้องสมุด', emoji: '📚', bg: '#0891b2', decoyEmoji: '🏋️', decoyLabel: 'Gym', decayBg: '#6366f1' },
  { en: 'Classroom', th: 'ห้องเรียน', emoji: '🏫', bg: '#16a34a', decoyEmoji: '🍽️', decoyLabel: 'Canteen', decayBg: '#ca8a04' },
  { en: 'Canteen', th: 'โรงอาหาร', emoji: '🍽️', bg: '#ca8a04', decoyEmoji: '🏫', decoyLabel: 'Classroom', decayBg: '#16a34a' },
  { en: 'Playground', th: 'สนามเด็กเล่น', emoji: '🛝', bg: '#db2777', decoyEmoji: '🏢', decoyLabel: 'Office', decayBg: '#475569' },
  { en: 'Office', th: 'ห้องสำนักงาน', emoji: '🏢', bg: '#475569', decoyEmoji: '🛝', decoyLabel: 'Playground', decayBg: '#db2777' },
  { en: 'Toilet', th: 'ห้องน้ำ', emoji: '🚻', bg: '#0369a1', decoyEmoji: '🎵', decoyLabel: 'Music Room', decayBg: '#9333ea' },
  { en: 'Computer Room', th: 'ห้องคอมพิวเตอร์', emoji: '💻', bg: '#1d4ed8', decoyEmoji: '🔬', decoyLabel: 'Science Room', decayBg: '#059669' },
  { en: 'Science Room', th: 'ห้องวิทยาศาสตร์', emoji: '🔬', bg: '#059669', decoyEmoji: '💻', decoyLabel: 'Computer Room', decayBg: '#1d4ed8' },
  { en: 'Music Room', th: 'ห้องดนตรี', emoji: '🎵', bg: '#9333ea', decoyEmoji: '🚻', decoyLabel: 'Toilet', decayBg: '#0369a1' },
];

function makeId(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '_');
}

export const placesAtSchoolLesson: LessonPack = {
  id: 'starter_places_at_school',
  schemaVersion: 1,
  title: 'Places at School',
  description: 'Learn school place vocabulary with English prompts and Thai answers.',
  languagePair: 'en-th',
  durationSeconds: 120,
  questionOrder: 'random',
  showAnswerTextAfterResponse: true,
  allowTouchFallback: true,
  packKind: 'solo',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  questions: places.map((p, i) => {
    // Alternate which side is correct per question for variety
    const correctSide = i % 2 === 0 ? 'left' : 'right';
    const correctChoice = {
      id: `${makeId(p.en)}_correct`,
      label: p.en,
      altText: `${p.en} — ${p.th}`,
      image: {
        kind: 'dataUrl' as const,
        value: placeholderSvg(p.emoji, p.en, p.bg),
      },
    };
    const decoyChoice = {
      id: `${makeId(p.en)}_decoy`,
      label: p.decoyLabel,
      altText: p.decoyLabel,
      image: {
        kind: 'dataUrl' as const,
        value: placeholderSvg(p.decoyEmoji, p.decoyLabel, p.decayBg),
      },
    };
    return {
      id: `starter_q_${makeId(p.en)}`,
      prompt: p.en,
      promptLanguage: 'en',
      answerText: p.th,
      left: correctSide === 'left' ? correctChoice : decoyChoice,
      right: correctSide === 'right' ? correctChoice : decoyChoice,
      correctSide,
      difficulty: 'easy' as const,
      tags: ['places', 'school', 'en-th'],
    };
  }),
};

import { seekerMobileBasicsLesson } from './seekerStarterLesson';
import { solanaBasicsLesson } from './solanaBasicsLesson';
import { islanddaoChallengeLesson } from './islanddaoChallengeLesson';

/** Built-in packs seeded on first launch (legacy classroom pack excluded). */
export const STARTER_LESSONS: LessonPack[] = [
  solanaBasicsLesson,
  islanddaoChallengeLesson,
  seekerMobileBasicsLesson,
];

/** Stable IDs for built-in packs — used for idempotent IndexedDB migration */
export const BUILTIN_LESSON_IDS = STARTER_LESSONS.map((lesson) => lesson.id);
