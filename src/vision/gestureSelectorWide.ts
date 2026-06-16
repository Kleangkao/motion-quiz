import type { GestureSelectorInput } from './types';

export function applyMirror(x: number, mirrored: boolean): number {
  return mirrored ? 1 - x : x;
}

/** Map normalized x to visual left/right side (wide-zone-debug fallback) */
export function sideFromDisplayX(
  displayXNorm: number,
  settings: GestureSelectorInput['settings'],
): 'left' | 'right' | null {
  if (displayXNorm < settings.leftZoneMaxPercent) return 'left';
  if (displayXNorm > settings.rightZoneMinPercent) return 'right';
  return null;
}
