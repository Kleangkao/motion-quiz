import { useCallback, useEffect, useState } from 'react';
import type { SelectionMode, TargetSensitivity } from '@/storage/types';
import { measureChoiceZones } from './choiceZones';
import { buildTargetZones, type TargetZoneSet } from './targetZones';

export function useTargetZones(
  containerRef: React.RefObject<HTMLElement | null>,
  leftRef: React.RefObject<HTMLElement | null>,
  rightRef: React.RefObject<HTMLElement | null>,
  selectionMode: SelectionMode,
  targetSensitivity: TargetSensitivity,
  deps: unknown[] = [],
): TargetZoneSet | null {
  const [zones, setZones] = useState<TargetZoneSet | null>(null);

  const measure = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const cr = container.getBoundingClientRect();
    if (cr.width <= 0 || cr.height <= 0) return;

    if (selectionMode === 'wide-zone-debug') {
      setZones(buildTargetZones(null, null, cr.width, cr.height, selectionMode, targetSensitivity));
      return;
    }

    const cards = measureChoiceZones(leftRef.current, rightRef.current, container);
    if (!cards) return;

    const built = buildTargetZones(
      cards.left,
      cards.right,
      cr.width,
      cr.height,
      selectionMode,
      targetSensitivity,
    );
    if (built) setZones(built);
  }, [containerRef, leftRef, rightRef, selectionMode, targetSensitivity]);

  useEffect(() => {
    measure();
    const t1 = requestAnimationFrame(measure);
    const t2 = setTimeout(measure, 100);

    const ro = new ResizeObserver(() => measure());
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener('resize', measure);

    return () => {
      cancelAnimationFrame(t1);
      clearTimeout(t2);
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [measure, ...deps]);

  return zones;
}

/** @deprecated Use useTargetZones */
export const useChoiceZones = useTargetZones;
