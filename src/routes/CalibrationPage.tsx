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
  calibrationForFacing,
} from '@/camera/cameraSetup';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { mergePlayState } from '@/game/playSessionState';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import { usePlayFlowLandscape } from '@/camera/usePlayFlowLandscape';
import { PLAY_FLOW_TOP_BAR, PLAY_FLOW_VIEWPORT, PLAY_FLOW_BAR_BTN, PLAY_FLOW_FACING } from '@/camera/playFlowLayout';
import { RotateToLandscapePrompt } from '@/components/game/RotateToLandscapePrompt';

const SAMPLE_DURATION_MS = 2000;
const DONE_AUTO_ADVANCE_MS = 500;

type CalibrationStep = 'camera' | 'sampling' | 'done';

export function CalibrationPage() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { showRotatePrompt } = usePlayFlowLandscape();

  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [step, setStep] = useState<CalibrationStep>('camera');
  const [samplingProgress, setSamplingProgress] = useState(0);
  const [calibration, setCalibration] = useState<CalibrationProfile>(DEFAULT_CALIBRATION);
  const [poseStatus, setPoseStatus] = useState<string>('Loading pose model…');

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const landmarkerRef = useRef(new PoseLandmarkerService());
  const landmarkSamplesRef = useRef<Landmark[][]>([]);
  const animFrameRef = useRef<number>(0);
  const samplingStartRef = useRef<number>(0);

  const { cameraState, start, stop } = useCamera({
    facingMode: PLAY_FLOW_FACING,
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
          mirrorForFacing(PLAY_FLOW_FACING),
        );
        setCalibration(profile);
        setStep('done');
      }
    };
    animFrameRef.current = requestAnimationFrame(collect);
  }, []);

  const handlePlay = useCallback(() => {
    if (settings) updateSettings({ lastUsedLessonId: lessonId });
    stop();
    navigate(`/play/${lessonId}/gesture-test`, {
      state: mergePlayState(location.state, {
        calibration: calibrationForFacing(calibration, PLAY_FLOW_FACING),
      }),
    });
  }, [settings, lessonId, stop, calibration, navigate, location.state]);

  useEffect(() => {
    if (step !== 'done') return;
    const timer = window.setTimeout(() => handlePlay(), DONE_AUTO_ADVANCE_MS);
    return () => clearTimeout(timer);
  }, [step, handlePlay]);

  const isMirrored = mirrorForFacing(PLAY_FLOW_FACING);

  return (
    <div ref={containerRef} className={`${PLAY_FLOW_VIEWPORT} play-flow-calibration`}>
      <video
        ref={videoRef}
        className={`absolute inset-0 h-full w-full object-cover ${isMirrored ? 'scale-x-[-1]' : ''}`}
        autoPlay
        playsInline
        muted
      />

      <div className="absolute inset-0 bg-black/50 pointer-events-none" />

      <div className={PLAY_FLOW_TOP_BAR}>
        <div className="flex justify-start">
          <button onClick={() => { stop(); navigate('/play'); }} className={PLAY_FLOW_BAR_BTN}>
            ← Back
          </button>
        </div>
        <h1 className="text-center text-sm font-bold text-white sm:text-base">Calibration</h1>
        <div aria-hidden />
      </div>

      {!settings ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <LoadingSpinner label="Loading…" />
        </div>
      ) : (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-between pt-12 play-flow-calibration-footer play-flow-calibration-body">
          <div className="flex flex-1 flex-col items-center justify-center pointer-events-none min-h-0 w-full max-w-md">
            <div className="relative h-20 w-20 shrink-0 sm:h-28 sm:w-28 play-flow-calibration-hand">
              <div className="flex h-full w-full items-center justify-center rounded-full border-4 border-dashed border-white/30">
                <span className="text-3xl opacity-80 sm:text-4xl">👋</span>
              </div>
              {step === 'sampling' && (
                <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
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
              <p className="mt-2 text-xs text-white/70 text-center px-4 sm:mt-3 sm:text-sm">
                Stand here. Both hands in view.
              </p>
            )}
          </div>

          <div className="play-flow-calibration-panel glass-card w-full max-w-md shrink-0 px-4 py-3 sm:max-w-lg sm:px-5 sm:py-4">
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
                <div className="space-y-2 text-center sm:space-y-3">
                  <p className="font-bold text-white text-sm sm:text-base">Get in frame</p>
                  <p className="text-xs text-white/65 leading-snug sm:text-sm">
                    Step back until both hands show on screen. You will point left or right to answer.
                  </p>
                  <p className="text-[10px] text-white/40 sm:text-[11px]">{poseStatus}</p>
                  <button onClick={startSampling} className="btn btn-primary btn-md w-full min-h-[44px] sm:btn-lg sm:min-h-[48px]">
                    Start
                  </button>
                </div>
              )}
              {step === 'sampling' && (
                <div className="space-y-1.5 text-center sm:space-y-2">
                  <p className="font-bold text-white text-sm sm:text-base">Hold still</p>
                  <p className="text-sm text-white/60">
                    {Math.round(samplingProgress * 100)}%
                  </p>
                </div>
              )}
              {step === 'done' && (
                <div className="space-y-1.5 text-center sm:space-y-2">
                  <p className="text-xl sm:text-2xl">✅</p>
                  <p className="font-bold text-white text-sm sm:text-base">Ready</p>
                  <p className="text-xs text-white/60 sm:text-sm">Starting gesture test…</p>
                </div>
              )}
            </div>
          </div>
        )}
      {showRotatePrompt && <RotateToLandscapePrompt />}
    </div>
  );
}
