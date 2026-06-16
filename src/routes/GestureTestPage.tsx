import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useCamera } from '@/camera/useCamera';
import { useVisionDetection } from '@/vision/useVisionDetection';
import { useTargetZones } from '@/vision/useTargetZones';
import type { TargetZoneSet } from '@/vision/targetZones';
import { DEFAULT_CALIBRATION } from '@/vision/calibration';
import type { CalibrationProfile } from '@/vision/types';
import { getSettings, updateSettings } from '@/storage/settingsStorage';
import type { AppSettings } from '@/storage/types';
import { DebugOverlay } from '@/components/game/DebugOverlay';
import { GestureStatus } from '@/components/game/GestureStatus';
import { mergePlayState } from '@/game/playSessionState';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import { isGestureInputAllowed } from '@/game/inputMode';
import { calibrationForFacing } from '@/camera/cameraSetup';

type TestStep = 'point-left' | 'left-done' | 'point-right' | 'right-done';

const AUTO_ADVANCE_MS = 700;

import { HoldProgressBar } from '@/components/game/HoldProgressBar';

/** Placeholder cards matching game layout for zone measurement */
function TestChoiceCard({
  side,
  label,
  active,
  holdProgress = 0,
  isCandidate = false,
  innerRef,
}: {
  side: 'left' | 'right';
  label: string;
  active: boolean;
  holdProgress?: number;
  isCandidate?: boolean;
  innerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const sideLabel = side === 'left' ? 'Left' : 'Right';
  const showHold = isCandidate && holdProgress > 0;

  return (
    <div className="flex flex-col items-center gap-2">
      {showHold && <HoldProgressBar progress={holdProgress} />}
      <div
        ref={innerRef}
        className={`relative flex w-48 min-h-[7.25rem] flex-col items-center justify-center gap-2 rounded-2xl border-2 px-4 py-4 backdrop-blur-md transition-all duration-150 ${
          isCandidate
            ? 'border-emerald-400/70 bg-slate-950/88 shadow-[0_12px_40px_rgba(0,0,0,0.55)]'
            : active
              ? 'border-indigo-400/70 bg-indigo-950/80 scale-[1.02]'
              : 'border-white/35 bg-slate-950/88 shadow-[0_12px_40px_rgba(0,0,0,0.55)]'
        }`}
      >
        <span className="absolute top-2 left-2 rounded-md bg-black/45 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white/55">
          {sideLabel}
        </span>
        <span className="text-3xl">{side === 'left' ? '👈' : '👉'}</span>
        <span className="text-sm font-semibold text-white">{label}</span>
      </div>
    </div>
  );
}

export function GestureTestPage() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  const calibration: CalibrationProfile =
    location.state?.calibration ?? DEFAULT_CALIBRATION;

  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [step, setStep] = useState<TestStep>('point-left');
  const [leftConfirmed, setLeftConfirmed] = useState(false);
  const [rightConfirmed, setRightConfirmed] = useState(false);
  const [debugMode, setDebugMode] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const targetZonesRef = useRef<TargetZoneSet | null>(null);
  const leftLockRef = useRef(false);
  const rightLockRef = useRef(false);
  const consumedLockIdRef = useRef(0);

  const requiredSide =
    step === 'point-left' ? 'left' as const :
    step === 'point-right' ? 'right' as const :
    undefined;

  const { cameraState, start, stop } = useCamera({
    facingMode: settings?.cameraFacingMode ?? 'user',
    resolution: settings?.cameraResolution ?? 'balanced',
  });

  const selectionMode = settings?.selectionMode ?? 'card-centered-target';
  const targetSensitivity = settings?.targetSensitivity ?? 'normal';

  const targetZones = useTargetZones(
    containerRef,
    leftRef,
    rightRef,
    selectionMode,
    targetSensitivity,
    [step],
  );
  targetZonesRef.current = targetZones;

  const gestureAllowed = isGestureInputAllowed(selectionMode);

  const facingMode = settings?.cameraFacingMode ?? 'user';
  const liveCalibration = calibrationForFacing(calibration, facingMode);

  const { gestureOutput, diagnostics, resetGesture } = useVisionDetection({
    videoRef,
    containerRef,
    calibration: liveCalibration,
    cameraState,
    enableHandLandmarker: settings?.enableHandLandmarker ?? true,
    targetSensitivity,
    gestureSubmissionEnabled: gestureAllowed,
    active: step === 'point-left' || step === 'point-right',
    targetZonesRef,
    requiredSide,
  });

  useEffect(() => {
    getSettings().then((s) => {
      setSettings(s);
      setDebugMode(s.showDebugOverlay);
    });
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (settings) start();
  }, [settings]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (cameraState.status === 'active' && videoRef.current) {
      videoRef.current.srcObject = cameraState.stream;
      videoRef.current.play().catch(() => {});
    }
  }, [cameraState]);

  useEffect(() => {
    if (step !== 'point-left' && step !== 'point-right') return;
    resetGesture();
    consumedLockIdRef.current = 0;
  }, [step, resetGesture]);

  useEffect(() => {
    const lockId = gestureOutput.lockEventId;
    if (!lockId || lockId === consumedLockIdRef.current) return;

    if (step === 'point-left' && gestureOutput.lockedSide === 'left' && !leftLockRef.current) {
      consumedLockIdRef.current = lockId;
      leftLockRef.current = true;
      setLeftConfirmed(true);
      resetGesture();
      setStep('left-done');
      return;
    }

    if (step === 'point-right' && gestureOutput.lockedSide === 'right' && !rightLockRef.current) {
      consumedLockIdRef.current = lockId;
      rightLockRef.current = true;
      setRightConfirmed(true);
      resetGesture();
      setStep('right-done');
    }
  }, [gestureOutput.lockEventId, gestureOutput.lockedSide, step, resetGesture]);

  const handleStartGame = useCallback(() => {
    if (settings) updateSettings({ lastUsedLessonId: lessonId });
    stop();
    navigate(`/play/${lessonId}/game`, {
      state: mergePlayState(location.state, { calibration: liveCalibration }),
    });
  }, [settings, lessonId, liveCalibration, navigate, stop, location.state]);

  useEffect(() => {
    if (step !== 'left-done') return;
    const timer = window.setTimeout(() => setStep('point-right'), AUTO_ADVANCE_MS);
    return () => clearTimeout(timer);
  }, [step]);

  useEffect(() => {
    if (step !== 'right-done') return;
    const timer = window.setTimeout(() => handleStartGame(), AUTO_ADVANCE_MS);
    return () => clearTimeout(timer);
  }, [step, handleStartGame]);

  const isMirrored = liveCalibration.mirrored;
  const displayW = containerRef.current?.offsetWidth ?? window.innerWidth;
  const displayH = containerRef.current?.offsetHeight ?? window.innerHeight;
  const videoW = videoRef.current?.videoWidth ?? 0;
  const videoH = videoRef.current?.videoHeight ?? 0;

  const instruction = (): string => {
    switch (step) {
      case 'point-left':
        return 'Point at LEFT and hold';
      case 'left-done':
        return 'Left OK — point RIGHT next';
      case 'point-right':
        return 'Point at RIGHT and hold';
      case 'right-done':
        return 'Starting game…';
      default:
        return '';
    }
  };

  return (
    <div ref={containerRef} className="relative min-h-screen bg-black overflow-hidden">
      <video
        ref={videoRef}
        className={`absolute inset-0 h-full w-full object-cover ${isMirrored ? 'scale-x-[-1]' : ''}`}
        autoPlay playsInline muted
      />
      <div className="absolute inset-0 bg-black/40" />

      <div className="relative z-10 flex min-h-screen flex-col p-6 safe-top safe-bottom">
        <div className="flex w-full items-center justify-between mb-4">
          <button onClick={() => { stop(); navigate(`/play/${lessonId}/calibrate`); }} className="btn btn-secondary btn-sm">
            ← Back
          </button>
          <h1 className="text-lg font-bold text-white">Gesture Test</h1>
          <div className="w-[4.5rem]" aria-hidden="true" />
        </div>

        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          {cameraState.status === 'requesting' && <LoadingSpinner label="Starting camera…" />}
          {cameraState.status === 'error' && (
            <ErrorMessage title="Camera Error" message={cameraState.error.message} onRetry={() => start()} />
          )}

          {cameraState.status === 'active' && (
            <div className="glass-card max-w-md px-5 py-3 text-center space-y-2 mb-auto mt-auto">
              <p className="font-bold text-white text-sm">{instruction()}</p>
              <div className="flex justify-center gap-4 text-xs">
                <span className={leftConfirmed ? 'text-green-400' : 'text-white/40'}>
                  {leftConfirmed ? '✅ Left' : '⬜ Left'}
                </span>
                <span className={rightConfirmed ? 'text-green-400' : 'text-white/40'}>
                  {rightConfirmed ? '✅ Right' : '⬜ Right'}
                </span>
              </div>
              {!gestureAllowed && (
                <p className="text-xs text-amber-300/90">
                  Turn off Touch-only mode in Settings.
                </p>
              )}
              {(step === 'point-left' || step === 'point-right') && (
                <GestureStatus
                  gestureOutput={gestureOutput}
                  diagnostics={diagnostics}
                  gestureInputEnabled={gestureAllowed}
                  touchFallbackActive={false}
                />
              )}
            </div>
          )}
        </div>

        {(step === 'point-left' || step === 'point-right' || step === 'left-done' || step === 'right-done') && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute left-[12%] top-[53%] -translate-x-1/2 -translate-y-1/2">
              <TestChoiceCard
                innerRef={leftRef}
                side="left"
                label="LEFT"
                active={step === 'point-left'}
                isCandidate={step === 'point-left' && gestureOutput.candidateSide === 'left'}
                holdProgress={step === 'point-left' && gestureOutput.candidateSide === 'left' ? gestureOutput.holdProgress : 0}
              />
            </div>
            <div className="absolute left-[88%] top-[53%] -translate-x-1/2 -translate-y-1/2">
              <TestChoiceCard
                innerRef={rightRef}
                side="right"
                label="RIGHT"
                active={step === 'point-right'}
                isCandidate={step === 'point-right' && gestureOutput.candidateSide === 'right'}
                holdProgress={step === 'point-right' && gestureOutput.candidateSide === 'right' ? gestureOutput.holdProgress : 0}
              />
            </div>
          </div>
        )}

        <div className="flex justify-center gap-3 mt-2">
          <button onClick={() => setDebugMode((d) => !d)} className="btn btn-secondary btn-sm text-xs">
            {debugMode ? 'Debug Off' : 'Debug'}
          </button>
        </div>
      </div>

      {debugMode && (
        <DebugOverlay
          diagnostics={diagnostics}
          mirrored={isMirrored}
          displayWidth={displayW}
          displayHeight={displayH}
          videoWidth={videoW}
          videoHeight={videoH}
          targetZones={targetZones}
        />
      )}
    </div>
  );
}
