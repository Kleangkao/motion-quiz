import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useCamera } from '@/camera/useCamera';
import { PoseLandmarkerService } from '@/vision/poseLandmarker';
import { buildCalibrationProfile, DEFAULT_CALIBRATION } from '@/vision/calibration';
import type { Landmark, CalibrationProfile } from '@/vision/types';
import { getSettings, updateSettings } from '@/storage/settingsStorage';
import type { AppSettings } from '@/storage/types';
import {
  mirrorForFacing,
  shouldShowCameraSwitchButton,
  toggleFacingMode,
  calibrationForFacing,
} from '@/camera/cameraSetup';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { mergePlayState } from '@/game/playSessionState';
import { ErrorMessage } from '@/components/common/ErrorMessage';

const SAMPLE_DURATION_MS = 2000;
const DONE_AUTO_ADVANCE_MS = 500;

type CalibrationStep = 'camera' | 'sampling' | 'done';

export function CalibrationPage() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [step, setStep] = useState<CalibrationStep>('camera');
  const [samplingProgress, setSamplingProgress] = useState(0);
  const [calibration, setCalibration] = useState<CalibrationProfile>(DEFAULT_CALIBRATION);
  const [poseStatus, setPoseStatus] = useState<string>('Loading pose model…');
  const [switchError, setSwitchError] = useState<string | null>(null);
  const [switching, setSwitching] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const landmarkerRef = useRef(new PoseLandmarkerService());
  const landmarkSamplesRef = useRef<Landmark[][]>([]);
  const animFrameRef = useRef<number>(0);
  const samplingStartRef = useRef<number>(0);

  const facingMode = settings?.cameraFacingMode ?? 'user';

  const { cameraState, start, stop, devices } = useCamera({
    facingMode,
    resolution: settings?.cameraResolution ?? 'balanced',
  });

  useEffect(() => {
    getSettings().then(setSettings);
    landmarkerRef.current
      .load()
      .then(() => setPoseStatus('Pose model ready'))
      .catch((e: Error) => setPoseStatus(`Pose model error: ${e.message}`));

    return () => {
      stop();
      landmarkerRef.current.close();
      cancelAnimationFrame(animFrameRef.current);
    };
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

  const handleSwitchCamera = useCallback(async () => {
    if (!settings || switching || step !== 'camera') return;

    const previousFacing = settings.cameraFacingMode;
    const nextFacing = toggleFacingMode(previousFacing);

    setSwitching(true);
    setSwitchError(null);
    stop();

    const switched = await start(undefined, nextFacing);
    if (!switched) {
      setSwitchError('Could not switch camera. Using your previous camera.');
      await start(undefined, previousFacing);
      setSwitching(false);
      return;
    }

    try {
      const updated = await updateSettings({
        cameraFacingMode: nextFacing,
        mirrorCamera: mirrorForFacing(nextFacing),
      });
      setSettings(updated);
    } catch {
      setSwitchError('Could not save camera preference.');
      stop();
      await start(undefined, previousFacing);
      await updateSettings({
        cameraFacingMode: previousFacing,
        mirrorCamera: mirrorForFacing(previousFacing),
      });
      setSettings((prev) =>
        prev
          ? {
              ...prev,
              cameraFacingMode: previousFacing,
              mirrorCamera: mirrorForFacing(previousFacing),
            }
          : prev,
      );
    } finally {
      setSwitching(false);
    }
  }, [settings, switching, step, stop, start]);

  const startSampling = useCallback(() => {
    landmarkSamplesRef.current = [];
    samplingStartRef.current = performance.now();
    setStep('sampling');

    const collect = () => {
      const elapsed = performance.now() - samplingStartRef.current;
      setSamplingProgress(Math.min(1, elapsed / SAMPLE_DURATION_MS));

      if (videoRef.current && landmarkerRef.current.getStatus() === 'ready') {
        const lms = landmarkerRef.current.detectForVideo(videoRef.current, performance.now());
        if (lms) landmarkSamplesRef.current.push(lms);
      }

      if (elapsed < SAMPLE_DURATION_MS) {
        animFrameRef.current = requestAnimationFrame(collect);
      } else {
        const profile = buildCalibrationProfile(
          landmarkSamplesRef.current,
          mirrorForFacing(facingMode),
        );
        setCalibration(profile);
        setStep('done');
      }
    };
    animFrameRef.current = requestAnimationFrame(collect);
  }, [facingMode]);

  const handlePlay = useCallback(() => {
    if (settings) updateSettings({ lastUsedLessonId: lessonId });
    stop();
    const facing = settings?.cameraFacingMode ?? 'user';
    navigate(`/play/${lessonId}/gesture-test`, {
      state: mergePlayState(location.state, {
        calibration: calibrationForFacing(calibration, facing),
      }),
    });
  }, [settings, lessonId, stop, facingMode, calibration, navigate, location.state]);

  useEffect(() => {
    if (step !== 'done') return;
    const timer = window.setTimeout(() => handlePlay(), DONE_AUTO_ADVANCE_MS);
    return () => clearTimeout(timer);
  }, [step, handlePlay]);

  const isMirrored = mirrorForFacing(facingMode);
  const showSwitchButton =
    step === 'camera' &&
    cameraState.status === 'active' &&
    shouldShowCameraSwitchButton(devices);

  return (
    <div className="relative min-h-screen bg-black overflow-hidden">
      <video
        ref={videoRef}
        className={`absolute inset-0 h-full w-full object-cover ${isMirrored ? 'scale-x-[-1]' : ''}`}
        autoPlay
        playsInline
        muted
      />

      <div className="absolute inset-0 bg-black/50" />

      {showSwitchButton && (
        <div className="absolute top-[4.5rem] right-4 z-20 safe-top">
          <button
            type="button"
            onClick={handleSwitchCamera}
            disabled={switching}
            aria-label="Switch camera"
            className="btn btn-secondary btn-sm text-xs shadow-lg bg-black/40 backdrop-blur-sm border-white/20"
          >
            {switching ? '…' : '🔄 Switch'}
          </button>
          {switchError && (
            <p className="mt-1 max-w-[10rem] text-right text-[10px] text-amber-300/90">
              {switchError}
            </p>
          )}
        </div>
      )}

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-between p-6 safe-top safe-bottom">
        <div className="flex w-full items-center justify-between">
          <button onClick={() => navigate('/play')} className="btn btn-secondary btn-sm">
            ← Back
          </button>
          <h1 className="text-lg font-bold text-white">Calibration</h1>
          <div className="w-[4.5rem]" aria-hidden="true" />
        </div>

        {!settings ? (
          <LoadingSpinner label="Loading…" />
        ) : (
          <div className="flex flex-1 flex-col w-full max-w-sm">
            <div className="flex flex-1 flex-col items-center justify-center pointer-events-none">
              <div className="relative">
                <div className="h-40 w-28 rounded-full border-4 border-dashed border-white/30 flex items-center justify-center">
                  <span className="text-5xl opacity-80">👋</span>
                </div>
                {step === 'sampling' && (
                  <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
                    <circle
                      cx="50" cy="50" r="46" fill="none" stroke="#818cf8" strokeWidth="4"
                      strokeDasharray={`${2 * Math.PI * 46}`}
                      strokeDashoffset={`${2 * Math.PI * 46 * (1 - samplingProgress)}`}
                      strokeLinecap="round"
                    />
                  </svg>
                )}
              </div>
              {step === 'camera' && cameraState.status === 'active' && (
                <p className="mt-4 text-sm text-white/70 text-center px-4">
                  Stand here. Both hands in view.
                </p>
              )}
            </div>

            <div className="glass-card px-5 py-4 w-full shrink-0">
              {step === 'camera' && cameraState.status === 'requesting' && (
                <LoadingSpinner label="Starting camera…" />
              )}
              {step === 'camera' && cameraState.status === 'error' && (
                <ErrorMessage
                  title="Camera Error"
                  message={cameraState.error.message}
                  onRetry={() => start()}
                />
              )}
              {step === 'camera' && cameraState.status === 'active' && (
                <div className="space-y-3 text-center">
                  <p className="font-bold text-white text-base">Get in frame</p>
                  <p className="text-sm text-white/65 leading-snug">
                    Step back until both hands show on screen. You will point left or right to answer.
                  </p>
                  <p className="text-[11px] text-white/40">{poseStatus}</p>
                  <button onClick={startSampling} className="btn btn-primary btn-lg w-full">
                    Start
                  </button>
                </div>
              )}
              {step === 'sampling' && (
                <div className="space-y-2 text-center">
                  <p className="font-bold text-white">Hold still</p>
                  <p className="text-sm text-white/60">
                    {Math.round(samplingProgress * 100)}%
                  </p>
                </div>
              )}
              {step === 'done' && (
                <div className="space-y-2 text-center">
                  <p className="text-2xl">✅</p>
                  <p className="font-bold text-white">Ready</p>
                  <p className="text-sm text-white/60">Starting gesture test…</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
