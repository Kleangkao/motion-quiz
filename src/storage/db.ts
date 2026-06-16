import Dexie, { type Table } from 'dexie';
import type { LessonPack, ResultSession, AppSettings } from './types';

export interface StoredImage {
  id: string;
  file: Blob;
  mimeType: string;
  originalName: string;
  sizeBytes: number;
  createdAt: string;
}

export interface SettingsRecord {
  key: 'app';
  value: AppSettings;
}

class GestureQuizDB extends Dexie {
  lessons!: Table<LessonPack, string>;
  images!: Table<StoredImage, string>;
  results!: Table<ResultSession, string>;
  settings!: Table<SettingsRecord, string>;

  constructor() {
    super('GestureQuizDB');
    this.version(1).stores({
      lessons: 'id, title, updatedAt',
      images: 'id, originalName, createdAt',
      results: 'id, lessonId, startedAt',
      settings: 'key',
    });
  }
}

export const db = new GestureQuizDB();
