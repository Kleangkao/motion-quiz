import type { LessonPack, QuizQuestion } from '@/storage/types';

function q(
  id: string,
  prompt: string,
  leftLabel: string,
  rightLabel: string,
  correctSide: 'left' | 'right',
  explanation?: string,
): QuizQuestion {
  return {
    id,
    prompt,
    left: { id: `${id}_left`, label: leftLabel },
    right: { id: `${id}_right`, label: rightLabel },
    correctSide,
    explanation,
    difficulty: 'easy',
    tags: ['solana', 'seeker', 'mobile'],
  };
}

export const seekerMobileBasicsLesson: LessonPack = {
  id: 'seeker_mobile_basics',
  schemaVersion: 1,
  title: 'Solana Mobile & Seeker Basics',
  description: 'Quick quiz on Mobile Wallet Adapter, Seed Vault, and the Solana dApp Store.',
  languagePair: 'en',
  durationSeconds: 120,
  questionOrder: 'random',
  showAnswerTextAfterResponse: true,
  allowTouchFallback: false,
  packKind: 'solo',
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
  questions: [
    q(
      'seeker_q_mwa',
      'Which protocol lets mobile dApps connect to Solana wallets?',
      'Mobile Wallet Adapter',
      'Bluetooth pairing only',
      'left',
      'MWA is the standard bridge between dApps and wallets on Solana Mobile.',
    ),
    q(
      'seeker_q_dapp_store',
      'Where are Seeker-native dApps published?',
      'Solana dApp Store',
      'Only via sideloading APKs',
      'left',
    ),
    q(
      'seeker_q_seed_vault',
      'Seed Vault on Seeker primarily helps with…',
      'Secure key storage',
      'Mining cryptocurrency',
      'left',
    ),
    q(
      'seeker_q_score_proof',
      'A signed score proof in this game…',
      'Proves you played — no funds move',
      'Automatically sends SOL rewards',
      'left',
    ),
    q(
      'seeker_q_android',
      'Mobile Wallet Adapter works best on…',
      'Android Seeker / Chrome PWA',
      'Desktop-only browsers',
      'left',
    ),
    q(
      'seeker_q_sgt',
      'Seeker Genesis Token (SGT) at a high level is…',
      'Seeker identity / participation',
      'A gas fee you pay each quiz',
      'left',
    ),
    q(
      'seeker_q_signing',
      'Before signing any wallet message, you should…',
      'Read what you are signing',
      'Always tap approve instantly',
      'left',
    ),
    q(
      'seeker_q_camera',
      'This quiz uses your camera to…',
      'Detect gestures on-device only',
      'Upload video to a server',
      'left',
    ),
  ],
};
