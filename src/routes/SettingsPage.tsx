import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSettings, updateSettings } from '@/storage/settingsStorage';
import { enumerateVideoDevices, requestCameraStream, stopStream } from '@/camera/cameraService';
import type { AppSettings, CameraResolutionPreset, SelectionMode } from '@/storage/types';
import type { VideoDevice } from '@/camera/cameraTypes';
import { PoseLandmarkerService } from '@/vision/poseLandmarker';
import { PageLayout } from '@/components/layout/PageLayout';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

const RESOLUTION_OPTIONS: { value: CameraResolutionPreset; label: string }[] = [
  { value: 'performance', label: 'Performance' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'quality', label: 'Quality' },
];

const SENSITIVITY_OPTIONS: { value: AppSettings['targetSensitivity']; label: string }[] = [
  { value: 'easy', label: 'Easy' },
  { value: 'normal', label: 'Normal' },
  { value: 'strict', label: 'Precise' },
];

const DETECTION_ZONE_OPTIONS: {
  value: SelectionMode;
  label: string;
  desc: string;
}[] = [
  {
    value: 'card-centered-target',
    label: 'Balanced card target',
    desc: 'Expanded zone around each answer card — recommended for most players',
  },
  {
    value: 'strict-card-target',
    label: 'Precise card target',
    desc: 'Your point must land on the card itself',
  },
  {
    value: 'wide-zone-debug',
    label: 'Wide zone for testing',
    desc: 'Wide left/right halves — useful for QA and troubleshooting',
  },
];

function SettingHint({ children }: { children: ReactNode }) {
  return <p className="text-xs text-white/45 leading-relaxed">{children}</p>;
}

function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="glass-card p-4 sm:p-5 space-y-4">
      <h3 className="font-bold text-white text-base">{title}</h3>
      {children}
    </div>
  );
}

export function SettingsPage() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [devices, setDevices] = useState<VideoDevice[]>([]);
  const [cameraTestActive, setCameraTestActive] = useState(false);
  const [poseStatus, setPoseStatus] = useState('Not tested yet');
  const [savedMsg, setSavedMsg] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const landmarkerRef = useRef<PoseLandmarkerService | null>(null);

  useEffect(() => {
    getSettings().then(setSettings);
    enumerateVideoDevices().then(setDevices);
    return () => {
      stopStream(streamRef.current);
      landmarkerRef.current?.close();
    };
  }, []);

  const save = async (patch: Partial<AppSettings>) => {
    const updated = await updateSettings(patch);
    setSettings(updated);
    setSavedMsg('Saved!');
    setTimeout(() => setSavedMsg(''), 1500);
  };

  const startCameraTest = async () => {
    if (!settings) return;
    stopStream(streamRef.current);
    const stream = await requestCameraStream(
      undefined,
      settings.cameraFacingMode,
      settings.cameraResolution,
    ).catch(() => null);
    if (stream && videoRef.current) {
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
      setCameraTestActive(true);
    }
  };

  const stopCameraTest = () => {
    stopStream(streamRef.current);
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraTestActive(false);
  };

  const testGestureTracking = async () => {
    setPoseStatus('Loading…');
    const lmk = new PoseLandmarkerService();
    landmarkerRef.current = lmk;
    try {
      await lmk.load();
      setPoseStatus('Ready — gesture tracking model loaded');
    } catch (e) {
      setPoseStatus(e instanceof Error ? e.message : String(e));
    }
  };

  if (!settings) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  const touchOnly = settings.selectionMode === 'debug-touch';

  const setTouchOnly = (enabled: boolean) => {
    if (enabled) {
      save({ selectionMode: 'debug-touch' });
    } else if (settings.selectionMode === 'debug-touch') {
      save({ selectionMode: 'card-centered-target' });
    }
  };

  return (
    <PageLayout title="Settings" backTo="/">
      <div className="space-y-4 max-w-lg mx-auto">
        {savedMsg && (
          <div className="rounded-xl bg-green-500/20 border border-green-500/30 px-4 py-2 text-green-400 text-sm text-center">
            {savedMsg}
          </div>
        )}

        <SettingHint>
          Tune camera and gesture controls for your device. Changes save automatically.
        </SettingHint>

        {/* Quick Setup */}
        <SectionCard title="Quick Setup">
          <div className="space-y-3">
            <div>
              <p className="text-xs text-white/60 mb-2">Camera</p>
              <div className="flex flex-wrap gap-3">
                {(['user', 'environment'] as const).map((mode) => (
                  <label
                    key={mode}
                    className="flex items-center gap-2 cursor-pointer text-sm text-white/80"
                  >
                    <input
                      type="radio"
                      name="facing"
                      checked={settings.cameraFacingMode === mode}
                      onChange={() => save({ cameraFacingMode: mode })}
                      className="accent-indigo-500"
                    />
                    {mode === 'user' ? 'Front' : 'Back'}
                  </label>
                ))}
              </div>
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.mirrorCamera}
                onChange={(e) => save({ mirrorCamera: e.target.checked })}
                className="accent-indigo-500 h-4 w-4 mt-0.5"
              />
              <span className="text-sm text-white/80">Mirror selfie view</span>
            </label>

            <div>
              <p className="text-xs text-white/60 mb-2">Quality / performance</p>
              <div className="flex flex-wrap gap-3">
                {RESOLUTION_OPTIONS.map(({ value, label }) => (
                  <label
                    key={value}
                    className="flex items-center gap-2 cursor-pointer text-sm text-white/80"
                  >
                    <input
                      type="radio"
                      name="res"
                      checked={settings.cameraResolution === value}
                      onChange={() => save({ cameraResolution: value })}
                      className="accent-indigo-500"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs text-white/60 mb-2">Gesture sensitivity</p>
              <div className="flex flex-wrap gap-3">
                {SENSITIVITY_OPTIONS.map(({ value, label }) => (
                  <label
                    key={value}
                    className="flex items-center gap-2 cursor-pointer text-sm text-white/80"
                  >
                    <input
                      type="radio"
                      name="targetSens"
                      checked={settings.targetSensitivity === value}
                      onChange={() => save({ targetSensitivity: value })}
                      className="accent-indigo-500"
                    />
                    {label}
                  </label>
                ))}
              </div>
              <p className="mt-2 text-xs text-white/40">
                Easy gives larger answer zones. Precise requires more accurate pointing.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <button type="button" onClick={startCameraTest} className="btn btn-secondary btn-sm">
                Test camera
              </button>
              {cameraTestActive && (
                <button type="button" onClick={stopCameraTest} className="btn btn-danger btn-sm">
                  Stop camera
                </button>
              )}
              <button
                type="button"
                onClick={() => navigate('/play/solana-basics/gesture-test')}
                className="btn btn-secondary btn-sm"
              >
                Test gestures
              </button>
            </div>

            {cameraTestActive && (
              <video
                ref={videoRef}
                className={`w-full max-w-xs rounded-xl ${settings.mirrorCamera ? 'scale-x-[-1]' : ''}`}
                autoPlay
                playsInline
                muted
              />
            )}
          </div>
        </SectionCard>

        {/* Gameplay */}
        <SectionCard title="Gameplay">
          <div className="space-y-4">
            <label className="flex items-start gap-3 cursor-pointer rounded-xl bg-white/5 p-3">
              <input
                type="checkbox"
                checked={touchOnly}
                onChange={(e) => setTouchOnly(e.target.checked)}
                className="accent-indigo-500 h-4 w-4 mt-0.5"
              />
              <div>
                <span className="text-sm font-semibold text-white">Touch-only mode</span>
                <p className="text-xs text-white/45 mt-1">
                  Use tap/click answers instead of gestures. Helpful for testing or accessibility.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer rounded-xl bg-white/5 p-3">
              <input
                type="checkbox"
                checked={settings.enablePhotoMiniGame}
                onChange={(e) => save({ enablePhotoMiniGame: e.target.checked })}
                className="accent-indigo-500 h-4 w-4 mt-0.5"
              />
              <div>
                <span className="text-sm font-semibold text-white">Photo mini-game</span>
                <p className="text-xs text-white/45 mt-1">
                  Optional local-only photo moment between questions.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 rounded-xl bg-white/5 p-3 opacity-60 cursor-not-allowed">
              <input
                type="checkbox"
                checked={false}
                disabled
                readOnly
                className="accent-indigo-500 h-4 w-4 mt-0.5"
              />
              <div>
                <span className="text-sm font-semibold text-white">Sound effects</span>
                <p className="text-xs text-white/45 mt-1">Coming later</p>
              </div>
            </label>
          </div>
        </SectionCard>

        {/* Advanced — collapsed by default */}
        <details className="glass-card group [&_summary::-webkit-details-marker]:hidden">
          <summary className="cursor-pointer list-none p-4 sm:p-5 font-bold text-white text-base flex items-center justify-between gap-2">
            <span>Advanced</span>
            <span className="text-xs font-normal text-white/40 group-open:hidden">QA & troubleshooting</span>
            <span className="text-xs font-normal text-white/40 hidden group-open:inline">Hide</span>
          </summary>
          <div className="px-4 sm:px-5 pb-4 sm:pb-5 space-y-5 border-t border-white/10 pt-4">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-white">Answer detection</p>
              <SettingHint>
                How the game decides which answer card you are pointing at.
              </SettingHint>
              {DETECTION_ZONE_OPTIONS.map(({ value, label, desc }) => (
                <label
                  key={value}
                  className={`flex items-start gap-3 cursor-pointer rounded-xl bg-white/5 p-3 ${
                    touchOnly ? 'opacity-50' : ''
                  }`}
                >
                  <input
                    type="radio"
                    name="selectionMode"
                    checked={settings.selectionMode === value}
                    disabled={touchOnly}
                    onChange={() => save({ selectionMode: value })}
                    className="accent-indigo-500 mt-1"
                  />
                  <div>
                    <span className="text-sm font-semibold text-white">{label}</span>
                    <p className="text-xs text-white/40 mt-0.5">{desc}</p>
                  </div>
                </label>
              ))}
              {touchOnly && (
                <p className="text-xs text-amber-300/80">
                  Turn off touch-only mode to change answer detection.
                </p>
              )}
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.showDebugOverlay}
                onChange={(e) => save({ showDebugOverlay: e.target.checked })}
                className="accent-indigo-500 h-4 w-4 mt-0.5"
              />
              <div>
                <span className="text-sm text-white/80">Show debug overlay</span>
                <p className="text-xs text-white/40 mt-0.5">
                  Display detection info during gameplay.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.enableHandLandmarker}
                onChange={(e) => save({ enableHandLandmarker: e.target.checked })}
                className="accent-indigo-500 h-4 w-4 mt-0.5"
              />
              <div>
                <span className="text-sm text-white/80">Improve close-range hand tracking</span>
                <p className="text-xs text-white/40 mt-0.5">
                  Helps when you are close to the camera and body pose is hard to detect.
                </p>
              </div>
            </label>

            <div>
              <button type="button" onClick={testGestureTracking} className="btn btn-secondary btn-sm">
                Test gesture tracking
              </button>
              <p className="mt-2 text-xs text-white/40">{poseStatus}</p>
            </div>

            {devices.length > 0 && (
              <div>
                <p className="text-xs text-white/60 mb-1">Detected cameras</p>
                <div className="space-y-1">
                  {devices.map((d) => (
                    <p key={d.deviceId} className="text-xs text-white/40 break-all">
                      {d.label || 'Camera'}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        </details>

        <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
          <p className="text-xs text-white/40 leading-relaxed">
            All camera processing stays on this device. No video or pose data is uploaded or stored.
          </p>
        </div>
      </div>
    </PageLayout>
  );
}
