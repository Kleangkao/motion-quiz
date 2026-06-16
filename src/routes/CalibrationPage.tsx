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

type CalibrationStep = 'choose-camera' | 'camera' | 'sampling' | 'done';

export function CalibrationPage() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [step, setStep] = useState<CalibrationStep>('choose-camera');
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
    if (settings && step !== 'choose-camera') {
      start();
    }
  }, [settings, step]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (cameraState.status === 'active' && videoRef.current) {
      videoRef.current.srcObject = cameraState.stream;
      videoRef.current.play().catch(() => {});
    }
  }, [cameraState]);

  const chooseCamera = async (facing: 'user' | 'environment') => {
    const updated = await updateSettings({ cameraFacingMode: facing });
    setSettings(updated);
    setStep('camera');
  };

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
    stop();
    navigate(`/play/${lessonId}/gesture-test`, {
      state: mergePlayState(location.state, { calibration: DEFAULT_CALIBRATION }),
    });
  };

  const handlePlay = () => {
    if (settings) updateSettings({ lastUsedLessonId: lessonId });
    stop();
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
  const pageTitle = step === 'choose-camera' ? 'Choose camera' : 'Calibration';

  return (
    <div className="relative min-h-screen bg-black overflow-hidden">
      {step !== 'choose-camera' && (
        <video
          ref={videoRef}
          className={`absolute inset-0 h-full w-full object-cover ${isMirrored ? 'scale-x-[-1]' : ''}`}
          autoPlay
          playsInline
          muted
        />
      )}

      <div className={`absolute inset-0 ${step === 'choose-camera' ? 'bg-gradient-to-b from-slate-950 via-indigo-950 to-slate-950' : 'bg-black/50'}`} />

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-between p-6 safe-top safe-bottom">
        <div className="flex w-full items-center justify-between">
          <button onClick={() => navigate('/play')} className="btn btn-secondary btn-sm">
            ← Back
          </button>
          <h1 className="text-lg font-bold text-white">{pageTitle}</h1>
          <button onClick={handleSkip} className="btn btn-secondary btn-sm text-xs">
            Skip
          </button>
        </div>

        <div className="flex flex-col items-center gap-6 text-center w-full max-w-sm">
          {step === 'choose-camera' && !settings && <LoadingSpinner label="Loading…" />}

          {step === 'choose-camera' && settings && (
            <div className="glass-card px-6 py-5 w-full space-y-4">
              <div className="space-y-1">
                <p className="font-bold text-white text-lg">Choose camera</p>
                <p className="text-sm text-white/60">Pick the camera you want to use for this round.</p>
              </div>
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => chooseCamera('user')}
                  className={`btn btn-lg w-full ${settings.cameraFacingMode === 'user' ? 'btn-primary' : 'btn-secondary'}`}
                >
                  Front camera
                </button>
                <button
                  type="button"
                  onClick={() => chooseCamera('environment')}
                  className={`btn btn-lg w-full ${settings.cameraFacingMode === 'environment' ? 'btn-primary' : 'btn-secondary'}`}
                >
                  Back camera
                </button>
              </div>
              <label className="flex items-center justify-center gap-2 cursor-pointer text-sm text-white/70">
                <input
                  type="checkbox"
                  checked={settings.mirrorCamera}
                  onChange={() => toggleMirror()}
                  className="accent-indigo-500 h-4 w-4"
                />
                Mirror selfie view
              </label>
              <p className="text-xs text-white/40">You can change this later in Settings.</p>
            </div>
          )}

          {step !== 'choose-camera' && (
            <>
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

              <div className="glass-card px-6 py-4 w-full">
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
                      <li>For laptop testing, sit farther back or use touch-only mode in Settings.</li>
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
            </>
          )}
        </div>

        {step !== 'choose-camera' && (
          <div className="flex gap-3">
            <button onClick={toggleMirror} className="btn btn-secondary btn-sm text-xs">
              {isMirrored ? '🪞 Mirror: On' : '🪞 Mirror: Off'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
