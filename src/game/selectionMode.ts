import type { SelectionMode } from '@/storage/types';

/** Whether touch/click on choice cards may submit an answer */
export function isTouchInputAllowed(
  selectionMode: SelectionMode,
  lessonAllowTouchFallback: boolean,
): boolean {
  if (selectionMode === 'debug-touch') return true;
  return lessonAllowTouchFallback && selectionMode === 'card-centered-target';
}

/** Whether pose/hand gesture detection may submit an answer */
export function isGestureInputAllowed(selectionMode: SelectionMode): boolean {
  return selectionMode !== 'debug-touch';
}

/** Whether keyboard arrow keys may submit an answer (debug only) */
export function isKeyboardInputAllowed(selectionMode: SelectionMode): boolean {
  return selectionMode === 'debug-touch';
}
