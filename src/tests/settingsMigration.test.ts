import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import {
  migrateLegacySettings,
  applyOneTimeWideZoneMigration,
  applyOneTimeSensitivityMigration,
} from '@/storage/settingsStorage';
import { DEFAULT_SETTINGS } from '@/storage/types';

describe('settings migration', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('one-time migrates persisted wide-zone-debug to card-centered-target', () => {
    const raw = { ...DEFAULT_SETTINGS, selectionMode: 'wide-zone-debug' as const };
    const merged = migrateLegacySettings(raw);
    expect(merged.selectionMode).toBe('wide-zone-debug');

    const migrated = applyOneTimeWideZoneMigration(raw, merged);
    expect(migrated.selectionMode).toBe('card-centered-target');
  });

  it('keeps card-centered-target as default for new settings', () => {
    const result = migrateLegacySettings({});
    expect(result.selectionMode).toBe('card-centered-target');
    expect(result.enablePhotoMiniGame).toBe(false);
  });

  it('preserves debug-touch selection mode', () => {
    const result = migrateLegacySettings({
      ...DEFAULT_SETTINGS,
      selectionMode: 'debug-touch',
    });
    expect(result.selectionMode).toBe('debug-touch');
  });

  it('preserves strict-card-target selection mode', () => {
    const result = migrateLegacySettings({
      ...DEFAULT_SETTINGS,
      selectionMode: 'strict-card-target',
    });
    expect(result.selectionMode).toBe('strict-card-target');
  });

  it('one-time migrates persisted easy/strict sensitivity to normal', () => {
    const rawEasy = { ...DEFAULT_SETTINGS, targetSensitivity: 'easy' as const };
    const mergedEasy = migrateLegacySettings(rawEasy);
    expect(mergedEasy.targetSensitivity).toBe('easy');

    const migratedEasy = applyOneTimeSensitivityMigration(rawEasy, mergedEasy);
    expect(migratedEasy.targetSensitivity).toBe('normal');

    localStorage.clear();

    const rawStrict = { ...DEFAULT_SETTINGS, targetSensitivity: 'strict' as const };
    const mergedStrict = migrateLegacySettings(rawStrict);
    const migratedStrict = applyOneTimeSensitivityMigration(rawStrict, mergedStrict);
    expect(migratedStrict.targetSensitivity).toBe('normal');
  });

  it('allows easy/strict sensitivity when explicitly set after one-time migration ran', () => {
    localStorage.setItem('mq-sensitivity-normal-v1', '1');
    const result = migrateLegacySettings({
      ...DEFAULT_SETTINGS,
      targetSensitivity: 'easy',
    });
    expect(result.targetSensitivity).toBe('easy');
  });

  it('allows wide-zone-debug when explicitly set after one-time migration ran', () => {
    localStorage.setItem('mq-wide-zone-default-v1', '1');
    const result = migrateLegacySettings({
      ...DEFAULT_SETTINGS,
      selectionMode: 'wide-zone-debug',
    });
    expect(result.selectionMode).toBe('wide-zone-debug');
  });
});

describe('sessionPhotoCache', () => {
  it('stores and retrieves photos in memory only', async () => {
    const { setSessionPhotos, getSessionPhotos, clearSessionPhotos } = await import(
      '@/game/sessionPhotoCache'
    );
    setSessionPhotos('sess-1', ['data:image/jpeg;base64,abc']);
    expect(getSessionPhotos('sess-1')).toEqual(['data:image/jpeg;base64,abc']);
    clearSessionPhotos('sess-1');
    expect(getSessionPhotos('sess-1')).toBeNull();
  });
});
