import { useCallback, useEffect, useRef, useState } from 'react';
import { captureVideoFrameAsync } from '@/utils/captureFrame';

interface Props {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  containerRef: React.RefObject<HTMLElement | null>;
  mirrored: boolean;
  onComplete: (photoDataUrl: string | null) => void;
}

const RUN_MS = 3400;
const PREVIEW_MS = 1400;
const WARP_INTERVAL_MS = 1100;
const WARP_ANIM_MS = 320;
const FRAME_W_RATIO = 0.38;
const FRAME_ASPECT = 4 / 3;
const MIN_WARP_DIST = 0.2;

type Phase = 'running' | 'flash' | 'preview';
type NormPoint = { x: number; y: number };

function pickRandomSpot(prev: NormPoint | null): NormPoint {
  const margin = FRAME_W_RATIO / 2;
  const yMin = 0.14;
  const yMax = 0.72;

  for (let attempt = 0; attempt < 10; attempt++) {
    const next: NormPoint = {
      x: margin + Math.random() * (1 - 2 * margin),
      y: yMin + Math.random() * (yMax - yMin),
    };
    if (!prev) return next;
    if (Math.hypot(next.x - prev.x, next.y - prev.y) >= MIN_WARP_DIST) return next;
  }

  if (!prev) return { x: 0.5, y: 0.42 };
  return {
    x: prev.x > 0.5 ? 0.22 : 0.78,
    y: prev.y > 0.42 ? 0.22 : 0.58,
  };
}

/**
 * Mini-game: photo frame warps between random spots (not continuous drag).
 * Player tries to get in frame before the snap.
 */
export function PhotoCaptureMiniGame({ videoRef, containerRef, mirrored, onComplete }: Props) {
  const [phase, setPhase] = useState<Phase>('running');
  const [countdown, setCountdown] = useState(3);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [framePos, setFramePos] = useState<NormPoint>(() => pickRandomSpot(null));
  const frameRef = useRef<HTMLDivElement>(null);
  const posRef = useRef<NormPoint>(framePos);
  const startRef = useRef(performance.now());

  const applyFrameLayout = useCallback(() => {
    const container = containerRef.current;
    const frame = frameRef.current;
    if (!container || !frame) return;

    const cr = container.getBoundingClientRect();
    const fw = cr.width * FRAME_W_RATIO;
    const fh = fw / FRAME_ASPECT;
    const { x, y } = posRef.current;

    frame.style.width = `${fw}px`;
    frame.style.height = `${fh}px`;
    frame.style.left = `${x * cr.width - fw / 2}px`;
    frame.style.top = `${y * cr.height - fh / 2}px`;
  }, [containerRef]);

  useEffect(() => {
    posRef.current = framePos;
    applyFrameLayout();
  }, [framePos, applyFrameLayout]);

  useEffect(() => {
    if (phase !== 'running') return;

    const onResize = () => applyFrameLayout();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [phase, applyFrameLayout]);

  useEffect(() => {
    if (phase !== 'running') return;

    const warp = () => {
      setFramePos((prev) => {
        const next = pickRandomSpot(prev);
        posRef.current = next;
        return next;
      });
    };

    warp();
    const warpId = window.setInterval(warp, WARP_INTERVAL_MS);
    return () => clearInterval(warpId);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'running') return;
    startRef.current = performance.now();

    const cd = window.setInterval(() => {
      const elapsed = performance.now() - startRef.current;
      const left = Math.ceil((RUN_MS - elapsed) / 1000);
      setCountdown(Math.max(0, left));
    }, 200);

    const snap = window.setTimeout(() => {
      void (async () => {
        const video = videoRef.current;
        const container = containerRef.current;
        const frame = frameRef.current;
        let url: string | null = null;

        if (video && container && frame) {
          const fr = frame.getBoundingClientRect();
          url = await captureVideoFrameAsync(
            video,
            { left: fr.left, top: fr.top, width: fr.width, height: fr.height },
            container.getBoundingClientRect(),
            mirrored,
          );
        }

        setPreviewUrl(url);
        setPhase('flash');
        setTimeout(() => setPhase('preview'), 180);
      })();
    }, RUN_MS);

    return () => {
      clearInterval(cd);
      clearTimeout(snap);
    };
  }, [phase, videoRef, containerRef, mirrored]);

  useEffect(() => {
    if (phase !== 'preview') return;
    const t = setTimeout(() => onComplete(previewUrl), PREVIEW_MS);
    return () => clearTimeout(t);
  }, [phase, previewUrl, onComplete]);

  return (
    <div className="absolute inset-0 z-40 pointer-events-none">
      <div className="absolute inset-0 bg-black/25" />

      {phase === 'running' && (
        <>
          <div className="absolute top-20 left-0 right-0 text-center z-50">
            <p className="text-2xl font-black text-white drop-shadow-lg">📸 Photo time!</p>
            <p className="text-sm text-white/80 mt-1">Jump into the frame!</p>
            <p className="text-4xl font-black text-yellow-300 mt-2 tabular-nums">{countdown || '📷'}</p>
          </div>

          <div
            ref={frameRef}
            className="absolute border-4 border-white rounded-2xl shadow-2xl overflow-hidden photo-frame-warp"
            style={{
              boxShadow: '0 0 0 9999px rgba(0,0,0,0.35)',
              transition: `left ${WARP_ANIM_MS}ms cubic-bezier(0.25, 0.85, 0.35, 1), top ${WARP_ANIM_MS}ms cubic-bezier(0.25, 0.85, 0.35, 1)`,
            }}
          >
            <div className="absolute inset-0 border-2 border-dashed border-white/40 rounded-xl m-2 pointer-events-none" />
            <div className="absolute -top-1 -left-1 h-6 w-6 border-t-4 border-l-4 border-yellow-400 rounded-tl-lg" />
            <div className="absolute -top-1 -right-1 h-6 w-6 border-t-4 border-r-4 border-yellow-400 rounded-tr-lg" />
            <div className="absolute -bottom-1 -left-1 h-6 w-6 border-b-4 border-l-4 border-yellow-400 rounded-bl-lg" />
            <div className="absolute -bottom-1 -right-1 h-6 w-6 border-b-4 border-r-4 border-yellow-400 rounded-br-lg" />
          </div>
        </>
      )}

      {phase === 'flash' && (
        <div className="absolute inset-0 bg-white animate-fade-in z-50" />
      )}

      {phase === 'preview' && previewUrl && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 z-50 gap-4">
          <p className="text-xl font-bold text-white">Nice! 🎉</p>
          <img
            src={previewUrl}
            alt="Captured moment"
            className="max-h-[50vh] max-w-[70vw] rounded-2xl border-4 border-white shadow-2xl object-cover"
          />
        </div>
      )}
    </div>
  );
}
