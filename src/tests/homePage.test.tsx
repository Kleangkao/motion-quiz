import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HomePage, SHOW_HOME_CONTINUE, SHOW_HOME_QUICK_PLAY } from '@/routes/HomePage';
import { SoloPlayPage } from '@/routes/SoloPlayPage';
import { STARTER_LESSONS } from '@/data/starterLessons';
import { FEATURED_PLAY_PACK_IDS } from '@/storage/seedLessons';
import type { LessonPack } from '@/storage/types';

vi.mock('@/solana/WalletProvider', () => ({
  useWallet: () => ({
    address: null,
    connecting: false,
    error: null,
    supportsTransactions: true,
    requestConnect: vi.fn(),
    sendTransaction: vi.fn(),
  }),
  shortenAddress: () => '—',
}));

vi.mock('@/components/wallet/WalletHeaderButton', () => ({
  WalletHeaderButton: () => null,
}));

vi.mock('@/storage/seedLessons', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/storage/seedLessons')>();
  return {
    ...actual,
    ensureStarterLessons: vi.fn().mockResolvedValue({ insertedIds: [], updatedIds: [] }),
    isRetiredBuiltinPack: () => false,
    isVisibleInPlay: (lesson: LessonPack) =>
      (FEATURED_PLAY_PACK_IDS as readonly string[]).includes(lesson.id) ||
      lesson.packKind !== 'challenge',
    isFeaturedPlayPack: (lesson: { id: string }) =>
      (FEATURED_PLAY_PACK_IDS as readonly string[]).includes(lesson.id),
    playStateForLesson: (lesson: LessonPack) => ({ lesson }),
  };
});

const { getLesson, listLessons } = vi.hoisted(() => ({
  getLesson: vi.fn(),
  listLessons: vi.fn(),
}));

vi.mock('@/storage/lessonStorage', () => ({
  getLesson,
  listLessons,
  importLesson: vi.fn(),
  exportLesson: vi.fn(),
}));

vi.mock('@/storage/settingsStorage', () => ({
  getSettings: vi.fn().mockResolvedValue({ lastUsedLessonId: 'solana-basics' }),
}));

describe('HomePage hackathon polish', () => {
  beforeEach(() => {
    getLesson.mockImplementation(async (id: string) =>
      STARTER_LESSONS.find((lesson) => lesson.id === id) ?? null,
    );
    listLessons.mockResolvedValue(STARTER_LESSONS);
  });

  it('keeps Quick Play and Continue flags disabled for hackathon polish', () => {
    expect(SHOW_HOME_QUICK_PLAY).toBe(false);
    expect(SHOW_HOME_CONTINUE).toBe(false);
  });

  it('does not render Quick Play topic cards when disabled', async () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Start Quiz/i })).toBeInTheDocument();
    });

    expect(screen.queryByText(/Quick play/i)).toBeNull();
    expect(screen.queryByRole('button', { name: /Continue:/i })).toBeNull();
  });

  it('does not render Continue when disabled even with a last-used lesson', async () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(getLesson).toHaveBeenCalled();
    });

    expect(screen.queryByRole('button', { name: /Continue: Solana/i })).toBeNull();
  });

  it('still links to Play via Start Quiz', async () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    );

    const startQuiz = await screen.findByRole('button', { name: /Start Quiz/i });
    expect(startQuiz).toBeInTheDocument();
    expect(startQuiz.textContent).toMatch(/Pick a topic and play/i);
  });
});

describe('SoloPlayPage featured topics', () => {
  beforeEach(() => {
    listLessons.mockResolvedValue(STARTER_LESSONS);
  });

  it('renders all active playable topics in order without Ride Market', async () => {
    render(
      <MemoryRouter>
        <SoloPlayPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Play' })).toBeInTheDocument();
    });

    const titles = (FEATURED_PLAY_PACK_IDS as readonly string[]).map(
      (id) => STARTER_LESSONS.find((lesson) => lesson.id === id)!.title,
    );

    expect(titles).toEqual([
      'Solana',
      'IslandDAO Challenge',
      'DoubleZero',
      'Play Solana',
      'Star Atlas',
      'MonkeDAO',
    ]);

    for (const title of titles) {
      expect(screen.getByRole('heading', { name: title, level: 2 })).toBeInTheDocument();
    }

    expect(screen.queryByRole('heading', { name: 'Ride Market', level: 2 })).toBeNull();
  });
});
