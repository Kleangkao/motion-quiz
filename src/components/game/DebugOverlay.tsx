import type { DetectionDiagnostics } from '@/vision/detectionTypes';
import type { TargetZoneSet } from '@/vision/targetZones';
import { landmarkToContainerNorm } from '@/vision/landmarkUtils';
import { HandLandmarkIndex } from '@/vision/handLandmarker';
import { PoseLandmarkIndex } from '@/vision/types';
import { classifyPointInTargets } from '@/vision/targetZones';

interface Props {
  diagnostics: DetectionDiagnostics;
  mirrored: boolean;
  displayWidth: number;
  displayHeight: number;
  videoWidth: number;
  videoHeight: number;
  targetZones?: TargetZoneSet | null;
}

function row(label: string, value: string | number | boolean | null | undefined) {
  const display =
    value === null || value === undefined
      ? '—'
      : typeof value === 'boolean'
        ? value ? 'yes' : 'no'
        : String(value);
  return (
    <div className="flex justify-between gap-4">
      <span className="text-white/50">{label}</span>
      <span className="text-green-300">{display}</span>
    </div>
  );
}

function rectToSvg(
  rect: { xMin: number; xMax: number; yMin: number; yMax: number },
  w: number,
  h: number,
) {
  return {
    x: rect.xMin * w,
    y: rect.yMin * h,
    width: (rect.xMax - rect.xMin) * w,
    height: (rect.yMax - rect.yMin) * h,
  };
}

export function DebugOverlay({
  diagnostics: d,
  mirrored,
  displayWidth,
  displayHeight,
  videoWidth,
  videoHeight,
  targetZones,
}: Props) {
  const g = d.gestureOutput;
  const layout = { videoWidth, videoHeight, displayWidth, displayHeight, mirrored };

  const candidatePoint = (() => {
    const tip = d.handLandmarks?.[0]?.[HandLandmarkIndex.INDEX_FINGER_TIP];
    const wrist = d.poseLandmarks?.[PoseLandmarkIndex.LEFT_WRIST]
      ?? d.poseLandmarks?.[PoseLandmarkIndex.RIGHT_WRIST];
    const lm = tip ?? wrist;
    if (!lm) return null;
    return landmarkToContainerNorm(lm, layout);
  })();

  const zoneHit = candidatePoint && targetZones
    ? classifyPointInTargets(candidatePoint.x, candidatePoint.y, targetZones)
    : 'none';

  return (
    <div className="pointer-events-none absolute inset-0 z-40">
      <div className="absolute left-2 top-14 max-h-[70vh] overflow-y-auto rounded-xl bg-black/90 p-3 text-[10px] font-mono text-green-400 space-y-0.5 w-56">
        <div className="font-bold text-white mb-1 text-xs">Detection Debug</div>
        {row('Camera', d.cameraStatus)}
        {row('Pose model', d.poseModelStatus)}
        {row('Hand model', d.handModelStatus)}
        {row('Mode', targetZones?.selectionMode ?? '—')}
        {row('Person detected', d.personDetected)}
        {row('Hands', d.handCount)}
        {row('Candidate', g.candidateSide ?? 'none')}
        {row('Zone hit', zoneHit)}
        {row('Hold', `${(g.holdProgress * 100).toFixed(0)}%`)}
        {row('Locked', g.lockedSide ?? 'none')}
        {row('Reason', g.reason ?? '—')}
        {row('FPS', d.fps.toFixed(1))}
        {row('Mirror', mirrored)}
      </div>

      <svg
        className="absolute inset-0"
        width={displayWidth}
        height={displayHeight}
        viewBox={`0 0 ${displayWidth} ${displayHeight}`}
      >
        {targetZones && (
          <>
            {/* Neutral dead zone */}
            {(() => {
              const r = rectToSvg(targetZones.neutral, displayWidth, displayHeight);
              return (
                <rect
                  {...r}
                  fill="rgba(239,68,68,0.08)"
                  stroke="rgba(239,68,68,0.5)"
                  strokeWidth="2"
                  strokeDasharray="10 6"
                />
              );
            })()}

            {(['left', 'right'] as const).map((side) => {
              const card = rectToSvg(targetZones[side].card, displayWidth, displayHeight);
              const hit = rectToSvg(targetZones[side].hit, displayWidth, displayHeight);
              return (
                <g key={side}>
                  <rect
                    {...hit}
                    fill="none"
                    stroke={side === 'left' ? 'rgba(129,140,248,0.45)' : 'rgba(251,191,36,0.45)'}
                    strokeWidth="2"
                    strokeDasharray="8 5"
                    rx={16}
                  />
                  <rect
                    {...card}
                    fill="none"
                    stroke={side === 'left' ? '#818cf8' : '#fbbf24'}
                    strokeWidth="3"
                    rx={12}
                  />
                </g>
              );
            })}
          </>
        )}

        {d.poseLandmarks?.slice(0, 25).map((lm, i) => {
          const { x, y } = landmarkToContainerNorm(lm, layout);
          return (
            <circle
              key={`p${i}`}
              cx={x * displayWidth}
              cy={y * displayHeight}
              r={5}
              fill="#34d399"
              opacity={lm.visibility ?? 0.8}
            />
          );
        })}

        {d.handLandmarks?.map((hand, hi) =>
          hand.map((lm, i) => {
            const { x, y } = landmarkToContainerNorm(lm, layout);
            return (
              <circle
                key={`h${hi}-${i}`}
                cx={x * displayWidth}
                cy={y * displayHeight}
                r={i === 8 ? 8 : 4}
                fill="#fbbf24"
                opacity={0.9}
              />
            );
          }),
        )}

        {candidatePoint && (
          <circle
            cx={candidatePoint.x * displayWidth}
            cy={candidatePoint.y * displayHeight}
            r={10}
            fill="none"
            stroke="#ffffff"
            strokeWidth="3"
          />
        )}
      </svg>
    </div>
  );
}
