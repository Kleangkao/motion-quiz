import { describe, expect, it } from 'vitest';
import { defaultPhotoIndex } from '@/utils/composeResultMoment';

describe('defaultPhotoIndex', () => {
  it('returns 0 when there are no photos', () => {
    expect(defaultPhotoIndex(0)).toBe(0);
  });

  it('picks the middle photo for three captures', () => {
    expect(defaultPhotoIndex(3)).toBe(1);
  });

  it('picks the only photo for a single capture', () => {
    expect(defaultPhotoIndex(1)).toBe(0);
  });

  it('picks the later photo for two captures', () => {
    expect(defaultPhotoIndex(2)).toBe(1);
  });
});
