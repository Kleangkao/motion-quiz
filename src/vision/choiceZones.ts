/** Normalized rectangle (0–1) relative to game container */
export interface NormalizedRect {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

export interface ChoiceZones {
  left: NormalizedRect;
  right: NormalizedRect;
}

export function measureChoiceZones(
  leftEl: HTMLElement | null,
  rightEl: HTMLElement | null,
  containerEl: HTMLElement | null,
): ChoiceZones | null {
  if (!leftEl || !rightEl || !containerEl) return null;
  const cr = containerEl.getBoundingClientRect();
  if (cr.width <= 0 || cr.height <= 0) return null;

  const toNorm = (r: DOMRect): NormalizedRect => ({
    xMin: Math.max(0, (r.left - cr.left) / cr.width),
    xMax: Math.min(1, (r.right - cr.left) / cr.width),
    yMin: Math.max(0, (r.top - cr.top) / cr.height),
    yMax: Math.min(1, (r.bottom - cr.top) / cr.height),
  });

  return {
    left: toNorm(leftEl.getBoundingClientRect()),
    right: toNorm(rightEl.getBoundingClientRect()),
  };
}

/** Check if a display-normalized point is inside a zone (with optional padding) */
export function pointInRect(
  x: number,
  y: number,
  rect: NormalizedRect,
  padding = 0,
): boolean {
  return (
    x >= rect.xMin - padding &&
    x <= rect.xMax + padding &&
    y >= rect.yMin - padding &&
    y <= rect.yMax + padding
  );
}

/** Which choice card zone contains this point? */
export function sideFromChoiceZones(
  displayXNorm: number,
  displayYNorm: number,
  zones: ChoiceZones,
  padding = 0.03,
): 'left' | 'right' | null {
  const inLeft = pointInRect(displayXNorm, displayYNorm, zones.left, padding);
  const inRight = pointInRect(displayXNorm, displayYNorm, zones.right, padding);
  if (inLeft && !inRight) return 'left';
  if (inRight && !inLeft) return 'right';
  return null;
}
