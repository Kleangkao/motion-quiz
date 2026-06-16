import { ensureStarterLessons } from './seedLessons';

/** Run once on app load — adds any missing built-in packs for returning users */
export function bootstrapAppStorage(): void {
  void ensureStarterLessons().catch((err) => {
    console.error('[Seeker Motion Quiz] Built-in pack migration failed:', err);
  });
}
