import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useCamera } from '@/camera/useCamera';
import { PoseLandmarkerService } from '@/vision/poseLandmarker';
import { buildCalibrationProfile, DEFAULT_CALIBRATION } from '@/vision/calibration';
import type { Landmark, CalibrationProfile } from '@/vision/types';
import { getSettings, updateSettings } from '@/storage/settingsStorage';
import type { AppSettings } from '@/storage/types';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { mergePlayState } from '@/game/playSessionState';
import { ErrorMessage } from '@/components/common/ErrorMessage';

const SAMPLE_DURATION_MS = 2000;

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

  const videoRef = useRef<HTMLVideoElement>(null);
  const landmarkerRef = useRef(new PoseLandmarkerService());
  const landmarkSamplesRef = useRef<Landmark[][]>([]);
  const animFrameRef = useRef<number>(0);
  const samplingStartRef = useRef<number>(0);

  const { cameraState, start, stop } = useCamera({
    facingMode: settings?.cameraFacingMode ?? 'user',
    resolution: settings?.cameraResolution ?? 'balanced',
  });

  // Load settings + start camera
  useEffect(() => {
    getSettings().then((s) => {
      setSettings(s);
    });
    // Load pose model
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
  }, [settings]);// eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (cameraState.status === 'active' && videoRef.current) {
      videoRef.current.srcObject = cameraState.stream;
      videoRef.current.play().catch(() => {});
    }
  }, [cameraState]);

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
          settings?.mirrorCamera ?? true,
        );
        setCalibration(profile);
        setStep('done');
      }
    };
    animFrameRef.current = requestAnimationFrame(collect);
  }, [settings]);

  const handleSkip = () => {
    navigate(`/play/${lessonId}/gesture-test`, {
      state: mergePlayState(location.state, { calibration: DEFAULT_CALIBRATION }),
    });
  };

  const handlePlay = () => {
    if (settings) updateSettings({ lastUsedLessonId: lessonId });
    navigate(`/play/${lessonId}/gesture-test`, {
      state: mergePlayState(location.state, { calibration }),
    });
  };

  const toggleMirror = async () => {
    if (!settings) return;
    const updated = await updateSettings({ mirrorCamera: !settings.mirrorCamera });
    setSettings(updated);
  };

  const isMirrored = settings?.mirrorCamera ?? true;

  return (
    <div className="relative min-h-screen bg-black overflow-hidden">
      {/* Camera preview */}
      <video
        ref={videoRef}
        className={`absolute inset-0 h-full w-full object-cover ${isMirrored ? 'scale-x-[-1]' : ''}`}
        autoPlay
        playsInline
        muted
      />

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/50" />

      {/* UI */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-between p-6 safe-top safe-bottom">
        {/* Header */}
        <div className="flex w-full items-center justify-between">
          <button onClick={() => navigate('/play')} className="btn btn-secondary btn-sm">
            ← Back
          </button>
          <h1 className="text-lg font-bold text-white">Calibration</h1>
          <button onClick={handleSkip} className="btn btn-secondary btn-sm text-xs">
            Skip
          </button>
        </div>

        {/* Center content */}
        <div className="flex flex-col items-center gap-6 text-center">
          {/* Guide silhouette */}
          <div className="relative">
            <div className="h-48 w-32 rounded-full border-4 border-dashed border-white/40 flex items-center justify-center">
              <span className="text-6xl">🧍</span>
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

          <div className="glass-card px-6 py-4 max-w-sm">
            {step === 'camera' && cameraState.status === 'requesting' && (
              <LoadingSpinner label="Requesting camera…" />
            )}
            {step === 'camera' && cameraState.status === 'error' && (
              <ErrorMessage
                title="Camera Error"
                message={cameraState.error.message}
                onRetry={() => start()}
              />
            )}
            {step === 'camera' && cameraState.status === 'active' && (
              <div className="space-y-3 text-left">
                <p className="font-bold text-white text-center">Stand in the center of the camera view</p>
                <ul className="text-sm text-white/70 space-y-2 list-disc pl-4">
                  <li>Step back until your head, shoulders, elbows, and hands can fit in the camera.</li>
                  <li>For laptop testing, sit farther back or use hand fallback in Settings.</li>
                  <li>For classroom play, stand about 1.5–2.5 meters from the camera.</li>
                  <li>Make sure both hands are visible when pointing.</li>
                </ul>
                <p className="text-xs text-white/50 text-center">{poseStatus}</p>
                <button onClick={startSampling} className="btn btn-primary btn-lg w-full">
                  Start Calibration
                </button>
              </div>
            )}
            {step === 'sampling' && (
              <div className="space-y-3">
                <p className="font-bold text-white">Hold still…</p>
                <p className="text-sm text-white/60">
                  Detecting your position — {Math.round(samplingProgress * 100)}%
                </p>
              </div>
            )}
            {step === 'done' && (
              <div className="space-y-3">
                <p className="text-2xl">✅</p>
                <p className="font-bold text-white">Calibrated!</p>
                <p className="text-xs text-white/50">
                  Body center: {(calibration.bodyCenterX * 100).toFixed(0)}%
                  | Shoulder width: {(calibration.shoulderWidthNorm * 100).toFixed(0)}%
                </p>
                <button onClick={handlePlay} className="btn btn-primary btn-lg w-full">
                  Continue to Gesture Test
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Bottom controls */}
        <div className="flex gap-3">
          <button onClick={toggleMirror} className="btn btn-secondary btn-sm text-xs">
            {isMirrored ? '🪞 Mirror: On' : '🪞 Mirror: Off'}
          </button>
        </div>
      </div>
    </div>
  );
}
