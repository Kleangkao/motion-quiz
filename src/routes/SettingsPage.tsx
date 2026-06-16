import { useEffect, useRef, useState } from 'react';
import { getSettings, updateSettings } from '@/storage/settingsStorage';
import { enumerateVideoDevices } from '@/camera/cameraService';
import { requestCameraStream, stopStream } from '@/camera/cameraService';
import type { AppSettings, CameraResolutionPreset } from '@/storage/types';
import type { VideoDevice } from '@/camera/cameraTypes';
import { PoseLandmarkerService } from '@/vision/poseLandmarker';
import { PageLayout } from '@/components/layout/PageLayout';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

export function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [devices, setDevices] = useState<VideoDevice[]>([]);
  const [cameraTestActive, setCameraTestActive] = useState(false);
  const [poseStatus, setPoseStatus] = useState('Not tested');
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
    const stream = await requestCameraStream(undefined, settings.cameraFacingMode, settings.cameraResolution).catch(() => null);
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

  const testPoseModel = async () => {
    setPoseStatus('Loading…');
    const lmk = new PoseLandmarkerService();
    landmarkerRef.current = lmk;
    try {
      await lmk.load();
      setPoseStatus(`✅ Ready (${lmk.getStatus()})`);
    } catch (e) {
      setPoseStatus(`❌ ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  if (!settings) return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner /></div>;

  return (
    <PageLayout title="Settings" backTo="/">
      <div className="space-y-6">
        {savedMsg && (
          <div className="rounded-xl bg-green-500/20 border border-green-500/30 px-4 py-2 text-green-400 text-sm text-center">
            {savedMsg}
          </div>
        )}

        {/* Camera settings */}
        <div className="glass-card p-5 space-y-4">
          <h3 className="font-bold text-white">Camera</h3>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.mirrorCamera}
              onChange={(e) => save({ mirrorCamera: e.target.checked })}
              className="accent-indigo-500 h-4 w-4"
            />
            <span className="text-sm text-white/80">Mirror camera (selfie view)</span>
          </label>

          <div>
            <label className="mb-1 block text-xs text-white/60">Facing Mode</label>
            <div className="flex gap-3">
              {(['user', 'environment'] as const).map((mode) => (
                <label key={mode} className="flex items-center gap-2 cursor-pointer text-sm text-white/80">
                  <input
                    type="radio" name="facing"
                    checked={settings.cameraFacingMode === mode}
                    onChange={() => save({ cameraFacingMode: mode })}
                    className="accent-indigo-500"
                  />
                  {mode === 'user' ? '📱 Front (selfie)' : '📷 Back'}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs text-white/60">Resolution</label>
            <div className="flex gap-3 flex-wrap">
              {(['performance', 'balanced', 'quality'] as CameraResolutionPreset[]).map((r) => (
                <label key={r} className="flex items-center gap-2 cursor-pointer text-sm text-white/80">
                  <input
                    type="radio" name="res"
                    checked={settings.cameraResolution === r}
                    onChange={() => save({ cameraResolution: r })}
                    className="accent-indigo-500"
                  />
                  <span className="capitalize">{r}</span>
                </label>
              ))}
            </div>
          </div>

          {devices.length > 0 && (
            <div>
              <label className="mb-1 block text-xs text-white/60">Available Cameras</label>
              <div className="space-y-1">
                {devices.map((d) => (
                  <p key={d.deviceId} className="text-xs text-white/40">{d.label}</p>
                ))}
              </div>
            </div>
          )}

          {/* Camera test */}
          <div>
            <div className="flex gap-3 mb-2">
              <button onClick={startCameraTest} className="btn btn-secondary btn-sm">
                Test Camera
              </button>
              {cameraTestActive && (
                <button onClick={stopCameraTest} className="btn btn-danger btn-sm">
                  Stop
                </button>
              )}
            </div>
            {cameraTestActive && (
              <video
                ref={videoRef}
                className={`w-full max-w-xs rounded-xl ${settings.mirrorCamera ? 'scale-x-[-1]' : ''}`}
                autoPlay playsInline muted
              />
            )}
          </div>
        </div>

        {/* Selection mode */}
        <div className="glass-card p-5 space-y-4">
          <h3 className="font-bold text-white">Target Selection Mode</h3>
          <p className="text-xs text-white/50">
            Default is card-centered targets: point at answer cards with a modest expanded hit zone.
          </p>
          <div className="space-y-2">
            {(
              [
                ['card-centered-target', 'Card-centered target (default)', 'Expanded zone around each card — balanced accuracy'],
                ['strict-card-target', 'Strict card target', 'Fingertip must land inside the exact card rectangle'],
                ['wide-zone-debug', 'Wide zone (debug)', 'Legacy 45% left/right halves — testing only'],
                ['debug-touch', 'Debug touch only', 'Disable gestures; tap/click to answer'],
              ] as const
            ).map(([value, label, desc]) => (
              <label key={value} className="flex items-start gap-3 cursor-pointer rounded-xl bg-white/5 p-3">
                <input
                  type="radio"
                  name="selectionMode"
                  checked={settings.selectionMode === value}
                  onChange={() => save({ selectionMode: value })}
                  className="accent-indigo-500 mt-1"
                />
                <div>
                  <span className="text-sm font-semibold text-white">{label}</span>
                  <p className="text-xs text-white/40">{desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Detection settings */}
        <div className="glass-card p-5 space-y-4">
          <h3 className="font-bold text-white">Target Sensitivity</h3>

          <div>
            <label className="mb-1 block text-xs text-white/60">Preset</label>
            <div className="flex gap-3 flex-wrap">
              {(['strict', 'normal', 'easy'] as const).map((s) => (
                <label key={s} className="flex items-center gap-2 cursor-pointer text-sm text-white/80">
                  <input
                    type="radio" name="targetSens"
                    checked={settings.targetSensitivity === s}
                    onChange={() => save({ targetSensitivity: s })}
                    className="accent-indigo-500"
                  />
                  <span className="capitalize">{s}</span>
                </label>
              ))}
            </div>
            <p className="mt-2 text-xs text-white/40">
              Controls expanded target margin and hold duration. Easy = larger card zones, not full-screen halves.
            </p>
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.enableHandLandmarker}
              onChange={(e) => save({ enableHandLandmarker: e.target.checked })}
              className="accent-indigo-500 h-4 w-4"
            />
            <span className="text-sm text-white/80">Enable hand landmarker (close-range fallback when pose fails)</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.showDebugOverlay}
              onChange={(e) => save({ showDebugOverlay: e.target.checked })}
              className="accent-indigo-500 h-4 w-4"
            />
            <span className="text-sm text-white/80">Show debug overlay in game</span>
          </label>

          {/* Pose model test */}
          <div>
            <button onClick={testPoseModel} className="btn btn-secondary btn-sm">
              Test Pose Model
            </button>
            <p className="mt-1 text-xs text-white/40">{poseStatus}</p>
          </div>
        </div>

        {/* UX settings */}
        <div className="glass-card p-5 space-y-4">
          <h3 className="font-bold text-white">Game UX</h3>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.enablePhotoMiniGame}
              onChange={(e) => save({ enablePhotoMiniGame: e.target.checked })}
              className="accent-indigo-500 h-4 w-4"
            />
            <span className="text-sm text-white/80">Photo mini-game between questions (local only, optional)</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.enableSoundEffects}
              onChange={(e) => save({ enableSoundEffects: e.target.checked })}
              className="accent-indigo-500 h-4 w-4"
            />
            <span className="text-sm text-white/80">Enable sound effects (coming soon)</span>
          </label>
        </div>

        {/* Privacy note */}
        <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
          <p className="text-xs text-white/40">
            🔒 All camera processing happens on this device only. No video or pose data is ever uploaded or stored.
          </p>
        </div>
      </div>
    </PageLayout>
  );
}
