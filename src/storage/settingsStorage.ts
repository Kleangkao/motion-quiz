import { db } from './db';
import type { AppSettings, SelectionMode, TargetSensitivity } from './types';
import { DEFAULT_SETTINGS } from './types';

function migrateLegacySettings(raw: Partial<AppSettings>): AppSettings {
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

  return merged;
}

export async function getSettings(): Promise<AppSettings> {
  const record = await db.settings.get('app');
  if (!record) return { ...DEFAULT_SETTINGS };
  return migrateLegacySettings(record.value as Partial<AppSettings>);
}

export async function updateSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  const current = await getSettings();
  const updated = migrateLegacySettings({ ...current, ...patch });
  await db.settings.put({ key: 'app', value: updated });
  return updated;
}

export type { SelectionMode, TargetSensitivity };
