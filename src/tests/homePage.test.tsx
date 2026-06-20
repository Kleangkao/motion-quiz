import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HomePage, SHOW_HOME_CONTINUE, SHOW_HOME_MOTION_TEASER, SHOW_HOME_QUICK_PLAY } from '@/routes/HomePage';
import { SoloPlayPage } from '@/routes/SoloPlayPage';
import { EMPTY_HOLD_MS, isTopicShortcutActive, TEASER_TOPICS } from '@/components/home/HomeMotionTeaser';
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
    expect(SHOW_HOME_MOTION_TEASER).toBe(true);
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

  it('renders the motion teaser below primary actions when enabled', async () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    );

    const teaser = await screen.findByTestId('home-motion-teaser');
    expect(teaser).toHaveTextContent('Motion Quiz');
    expect(teaser.textContent).toContain('·');
    expect(teaser).not.toHaveTextContent('feels');

    const settings = screen.getByRole('button', { name: /Settings/i });
    const preview = screen.getByTestId('home-mini-preview');
    const privacy = screen.getByText(/Camera processing stays on your device/i);

    expect(
      settings.compareDocumentPosition(teaser) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      teaser.compareDocumentPosition(preview) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      preview.compareDocumentPosition(privacy) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('renders the mini preview card below the teaser', async () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    );

    const preview = await screen.findByTestId('home-mini-preview');
    expect(preview).toHaveTextContent('Choose a topic');
    expect(preview).toHaveTextContent('Answer with motion');
    expect(preview).toHaveTextContent('Optional score proof');
  });

  it('enables topic shortcut once characters are visible', () => {
    expect(isTopicShortcutActive('S', 'typing')).toBe(true);
    expect(isTopicShortcutActive('Sol', 'deleting')).toBe(true);
    expect(isTopicShortcutActive('', 'emptyHold')).toBe(false);
    expect(isTopicShortcutActive('', 'typing')).toBe(false);
  });

  it('uses a short hold after deleting the typewriter word', () => {
    expect(EMPTY_HOLD_MS).toBe(500);
  });

  it('rotates featured topic names instead of mood words', () => {
    expect(TEASER_TOPICS.map((topic) => topic.title)).toEqual([
      'Solana',
      'IslandDAO',
      'Ride Markets',
      'DoubleZero',
      'Play Solana',
      'Star Atlas',
      'MonkeDAO',
    ]);
    expect(TEASER_TOPICS.map((topic) => topic.title)).not.toContain('fun');
    expect(TEASER_TOPICS.map((topic) => topic.title)).not.toContain('on-chain');
  });

  it('keeps Start Quiz, Scores, and Settings visible with teaser enabled', async () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    );

    await screen.findByTestId('home-motion-teaser');

    expect(screen.getByRole('button', { name: /Start Quiz/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Scores/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Settings/i })).toBeInTheDocument();
  });
});

describe('SoloPlayPage featured topics', () => {
  beforeEach(() => {
    listLessons.mockResolvedValue(STARTER_LESSONS);
  });

  it('renders all active playable topics in order including Ride Markets', async () => {
    render(
      <MemoryRouter>
        <SoloPlayPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Choose a quiz topic', level: 1 })).toBeInTheDocument();
    });

    const titles = (FEATURED_PLAY_PACK_IDS as readonly string[]).map(
      (id) => STARTER_LESSONS.find((lesson) => lesson.id === id)!.title,
    );

    expect(titles).toEqual([
      'Solana',
      'IslandDAO Challenge',
      'Ride Markets',
      'DoubleZero',
      'Play Solana',
      'Star Atlas',
      'MonkeDAO',
    ]);

    for (const title of titles) {
      expect(screen.getByRole('heading', { name: title, level: 2 })).toBeInTheDocument();
    }
  });

  it('shows featured topics before create/import actions', async () => {
    render(
      <MemoryRouter>
        <SoloPlayPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Featured topics', level: 2 })).toBeInTheDocument();
    });

    const featuredHeading = screen.getByRole('heading', { name: 'Featured topics', level: 2 });
    const createHeading = screen.getByRole('heading', { name: 'Create your own', level: 2 });

    expect(
      featuredHeading.compareDocumentPosition(createHeading) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('keeps Create Topic and Import Pack actions available', async () => {
    render(
      <MemoryRouter>
        <SoloPlayPage />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('button', { name: 'Create Topic' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Import Pack' })).toBeInTheDocument();
  });

  it('lifts Play topic cards upward on hover and focus', async () => {
    const { container } = render(
      <MemoryRouter>
        <SoloPlayPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Solana', level: 2 })).toBeInTheDocument();
    });

    const card = container.querySelector('.glass-card');
    expect(card).toBeTruthy();
    expect(card!.className).toContain('hover:-translate-y-1');
    expect(card!.className).toContain('focus-within:-translate-y-1');
    expect(card!.className).toContain('transform-gpu');
    expect(card!.className).not.toMatch(/translate-x/);
  });
});
