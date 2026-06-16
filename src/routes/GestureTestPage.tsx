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
import { usePlayFlowLandscape } from '@/camera/usePlayFlowLandscape';
import {
  PLAY_FLOW_CARD_LEFT,
  PLAY_FLOW_CARD_RIGHT,
  PLAY_FLOW_GESTURE_STATUS,
  PLAY_FLOW_GESTURE_TEST_PROMPT,
  PLAY_FLOW_TOP_BAR,
  PLAY_FLOW_VIEWPORT,
  PLAY_FLOW_BAR_BTN,
  PLAY_FLOW_FACING,
} from '@/camera/playFlowLayout';
import { RotateToLandscapePrompt } from '@/components/game/RotateToLandscapePrompt';
import { PlayFlowFullscreenButton } from '@/components/game/PlayFlowFullscreenButton';
import { HoldProgressBar } from '@/components/game/HoldProgressBar';

type TestStep = 'point-left' | 'left-done' | 'point-right' | 'right-done';

const AUTO_ADVANCE_MS = 700;

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
        className={`play-flow-choice-card relative flex w-40 min-h-[6.5rem] flex-col items-center justify-center gap-2 rounded-2xl border-2 px-3 py-3 backdrop-blur-md transition-all duration-150 sm:w-48 sm:min-h-[7.25rem] sm:px-4 sm:py-4 ${
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
        <span className="text-2xl sm:text-3xl">{side === 'left' ? '👈' : '👉'}</span>
        <span className="text-xs font-semibold text-white sm:text-sm">{label}</span>
      </div>
    </div>
  );
}

export function GestureTestPage() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { showRotatePrompt } = usePlayFlowLandscape();

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
    facingMode: PLAY_FLOW_FACING,
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

  const facingMode = PLAY_FLOW_FACING;
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

  const showCards =
    step === 'point-left' || step === 'point-right' || step === 'left-done' || step === 'right-done';

  return (
    <div ref={containerRef} className={PLAY_FLOW_VIEWPORT}>
      <video
        ref={videoRef}
        className={`absolute inset-0 h-full w-full object-cover ${isMirrored ? 'scale-x-[-1]' : ''}`}
        autoPlay
        playsInline
        muted
      />
      <div className="absolute inset-0 bg-black/40 pointer-events-none" />

      <div className={PLAY_FLOW_TOP_BAR}>
        <div className="flex justify-start">
          <button
            onClick={() => { stop(); navigate(`/play/${lessonId}/calibrate`); }}
            className={PLAY_FLOW_BAR_BTN}
          >
            ← Back
          </button>
        </div>
        <h1 className="sr-only">Gesture Test</h1>
        <div className="flex justify-end">
          <button onClick={() => setDebugMode((d) => !d)} className={`${PLAY_FLOW_BAR_BTN} text-xs`}>
            {debugMode ? 'Debug Off' : 'Debug'}
          </button>
        </div>
      </div>

      {cameraState.status === 'requesting' && (
        <div className="absolute inset-0 z-30 flex items-center justify-center">
          <LoadingSpinner label="Starting camera…" />
        </div>
      )}

      {cameraState.status === 'error' && (
        <div className="absolute inset-0 z-30 flex items-center justify-center px-6">
          <ErrorMessage title="Camera Error" message={cameraState.error.message} onRetry={() => start()} />
        </div>
      )}

      {cameraState.status === 'active' && (
        <>
          <div className={PLAY_FLOW_GESTURE_TEST_PROMPT}>
            <div className="rounded-xl bg-black/75 px-3 py-1.5 backdrop-blur-sm shadow-lg border border-white/10 max-w-[13rem] sm:max-w-xs">
              <p className="text-xs font-bold text-white leading-tight text-center sm:text-sm">
                {instruction()}
              </p>
            </div>
            <div className="flex justify-center gap-3 rounded-lg bg-black/50 px-2.5 py-0.5 text-[10px] backdrop-blur-sm sm:text-xs">
              <span className={leftConfirmed ? 'text-green-400' : 'text-white/40'}>
                {leftConfirmed ? '✅ Left' : '⬜ Left'}
              </span>
              <span className={rightConfirmed ? 'text-green-400' : 'text-white/40'}>
                {rightConfirmed ? '✅ Right' : '⬜ Right'}
              </span>
            </div>
            {!gestureAllowed && (
              <p className="max-w-[13rem] text-center text-[10px] text-amber-300/90 sm:text-xs">
                Turn off Touch-only mode in Settings.
              </p>
            )}
          </div>

          {(step === 'point-left' || step === 'point-right') && (
            <div className={PLAY_FLOW_GESTURE_STATUS}>
              <GestureStatus
                gestureOutput={gestureOutput}
                diagnostics={diagnostics}
                gestureInputEnabled={gestureAllowed}
                touchFallbackActive={false}
              />
            </div>
          )}
        </>
      )}

      {showCards && (
        <div className="absolute inset-0 z-10 pointer-events-none">
          <div className={PLAY_FLOW_CARD_LEFT}>
            <TestChoiceCard
              innerRef={leftRef}
              side="left"
              label="LEFT"
              active={step === 'point-left'}
              isCandidate={step === 'point-left' && gestureOutput.candidateSide === 'left'}
              holdProgress={
                step === 'point-left' && gestureOutput.candidateSide === 'left'
                  ? gestureOutput.holdProgress
                  : 0
              }
            />
          </div>
          <div className={PLAY_FLOW_CARD_RIGHT}>
            <TestChoiceCard
              innerRef={rightRef}
              side="right"
              label="RIGHT"
              active={step === 'point-right'}
              isCandidate={step === 'point-right' && gestureOutput.candidateSide === 'right'}
              holdProgress={
                step === 'point-right' && gestureOutput.candidateSide === 'right'
                  ? gestureOutput.holdProgress
                  : 0
              }
            />
          </div>
        </div>
      )}

      {showRotatePrompt && <RotateToLandscapePrompt />}

      <PlayFlowFullscreenButton containerRef={containerRef} />

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
