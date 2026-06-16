import { db } from './db';
import type { StoredImage } from './db';
import type { LessonImageRef } from './types';
import { generateId, nowIso } from '@/utils/ids';
import { AppError } from '@/utils/errors';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

export async function saveImage(file: File): Promise<string> {
  if (file.size > MAX_IMAGE_BYTES) {
    throw new AppError(
      `Image is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is 5 MB.`,
      'IMAGE_TOO_LARGE',
    );
  }
  const id = generateId();
  const record: StoredImage = {
    id,
    file,
    mimeType: file.type,
    originalName: file.name,
    sizeBytes: file.size,
    createdAt: nowIso(),
  };
  await db.images.add(record);
  return id;
}

export async function getImageUrl(ref: LessonImageRef): Promise<string | null> {
  if (ref.kind === 'dataUrl' || ref.kind === 'external') return ref.value;
  if (ref.kind === 'asset') return `/starter-assets/${ref.value}`;
  if (ref.kind === 'indexeddb') {
    const record = await db.images.get(ref.value);
    if (!record) return null;
    return URL.createObjectURL(record.file);
  }
  return null;
}

export async function deleteImage(id: string): Promise<void> {
  await db.images.delete(id);
}

export async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = () => reject(new AppError('Failed to read image', 'READ_ERROR'));
    reader.readAsDataURL(file);
  });
}
