import { db } from './db';
import type { AppSettings, SelectionMode, TargetSensitivity } from './types';
import { DEFAULT_SETTINGS } from './types';
import { mirrorForFacing } from '@/camera/cameraSetup';

const WIDE_ZONE_MIGRATION_KEY = 'mq-wide-zone-default-v1';
const SENSITIVITY_MIGRATION_KEY = 'mq-sensitivity-normal-v1';

export function migrateLegacySettings(raw: Partial<AppSettings>): AppSettings {
  const merged = { ...DEFAULT_SETTINGS, ...raw };

  if (raw.inputMode !== undefined && raw.selectionMode === undefined) {
    merged.selectionMode =
      raw.inputMode === 'touch-only-debug' ? 'debug-touch' : 'card-centered-target';
  }

  if (raw.sensitivityPreset !== undefined && raw.targetSensitivity === undefined) {
    const sp = raw.sensitivityPreset;
    merged.targetSensitivity =
      sp === 'low' ? 'strict' : sp === 'high' ? 'easy' : 'normal';
  }

  merged.mirrorCamera = mirrorForFacing(merged.cameraFacingMode);

  return merged;
}

export function applyOneTimeWideZoneMigration(
  raw: Partial<AppSettings>,
  settings: AppSettings,
): AppSettings {
  if (typeof localStorage === 'undefined') return settings;
  if (localStorage.getItem(WIDE_ZONE_MIGRATION_KEY)) return settings;
  localStorage.setItem(WIDE_ZONE_MIGRATION_KEY, '1');
  if (raw.selectionMode === 'wide-zone-debug') {
    return { ...settings, selectionMode: 'card-centered-target' };
  }
  return settings;
}

/** One-time: reset legacy easy/strict sensitivity picks to normal for consistent play. */
export function applyOneTimeSensitivityMigration(
  raw: Partial<AppSettings>,
  settings: AppSettings,
): AppSettings {
  if (typeof localStorage === 'undefined') return settings;
  if (localStorage.getItem(SENSITIVITY_MIGRATION_KEY)) return settings;
  localStorage.setItem(SENSITIVITY_MIGRATION_KEY, '1');
  const sens = raw.targetSensitivity;
  if (sens === 'easy' || sens === 'strict') {
    return { ...settings, targetSensitivity: 'normal' };
  }
  return settings;
}

export async function getSettings(): Promise<AppSettings> {
  const record = await db.settings.get('app');
  if (!record) return { ...DEFAULT_SETTINGS };
  const raw = record.value as Partial<AppSettings>;
  const migrated = migrateLegacySettings(raw);
  const withWideZone = applyOneTimeWideZoneMigration(raw, migrated);
  const normalized = applyOneTimeSensitivityMigration(raw, withWideZone);
  const needsPersist =
    (raw.selectionMode === 'wide-zone-debug' &&
      normalized.selectionMode === 'card-centered-target') ||
    ((raw.targetSensitivity === 'easy' || raw.targetSensitivity === 'strict') &&
      normalized.targetSensitivity === 'normal');
  if (needsPersist) {
    await db.settings.put({ key: 'app', value: normalized });
  }
  return normalized;
}

export async function updateSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  const current = await getSettings();
  const merged = { ...current, ...patch };
  if (patch.cameraFacingMode !== undefined) {
    merged.mirrorCamera = mirrorForFacing(patch.cameraFacingMode);
  }
  const updated = migrateLegacySettings(merged);
  await db.settings.put({ key: 'app', value: updated });
  return updated;
}

export type { SelectionMode, TargetSensitivity };
