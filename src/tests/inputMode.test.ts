import { describe, it, expect } from 'vitest';
import {
  isTouchInputAllowed,
  isGestureInputAllowed,
  isKeyboardInputAllowed,
} from '@/game/selectionMode';

describe('selectionMode', () => {
  it('card-centered-target: touch not allowed unless lesson fallback', () => {
    expect(isTouchInputAllowed('card-centered-target', true)).toBe(true);
    expect(isTouchInputAllowed('card-centered-target', false)).toBe(false);
  });

  it('debug-touch: touch always allowed', () => {
    expect(isTouchInputAllowed('debug-touch', false)).toBe(true);
  });

  it('card-centered-target: gesture enabled', () => {
    expect(isGestureInputAllowed('card-centered-target')).toBe(true);
  });

  it('debug-touch: gesture disabled', () => {
    expect(isGestureInputAllowed('debug-touch')).toBe(false);
  });

  it('keyboard only in debug-touch', () => {
    expect(isKeyboardInputAllowed('card-centered-target')).toBe(false);
    expect(isKeyboardInputAllowed('debug-touch')).toBe(true);
  });
});
