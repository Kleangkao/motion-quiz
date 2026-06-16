import { useState, useEffect, useRef, useCallback } from 'react';
import type { CameraState, VideoDevice, ResolutionPreset } from './cameraTypes';
import {
  requestCameraStream,
  enumerateVideoDevices,
  stopStream,
} from './cameraService';

export interface UseCameraOptions {
  facingMode?: 'user' | 'environment';
  resolution?: ResolutionPreset;
  autoStart?: boolean;
}

export interface UseCameraReturn {
  cameraState: CameraState;
  devices: VideoDevice[];
  selectedDeviceId: string | undefined;
  start: (deviceId?: string) => Promise<void>;
  stop: () => void;
  switchCamera: () => Promise<void>;
  selectDevice: (deviceId: string) => Promise<void>;
  attachToVideo: (el: HTMLVideoElement | null) => void;
}

export function useCamera(options: UseCameraOptions = {}): UseCameraReturn {
  const { facingMode = 'user', resolution = 'balanced', autoStart = false } = options;

  const [cameraState, setCameraState] = useState<CameraState>({ status: 'idle' });
  const [devices, setDevices] = useState<VideoDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | undefined>(undefined);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const attachToVideo = useCallback((el: HTMLVideoElement | null) => {
    videoRef.current = el;
    if (el && streamRef.current) {
      el.srcObject = streamRef.current;
    }
  }, []);

  const stop = useCallback(() => {
    stopStream(streamRef.current);
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraState({ status: 'idle' });
  }, []);

  const start = useCallback(
    async (deviceId?: string) => {
      setCameraState({ status: 'requesting' });
      try {
        const stream = await requestCameraStream(
          deviceId ?? selectedDeviceId,
          facingMode,
          resolution,
        );
        // Stop previous stream if any
        stopStream(streamRef.current);
        streamRef.current = stream;

        const track = stream.getVideoTracks()[0];
        const usedDeviceId = track.getSettings().deviceId ?? deviceId ?? 'unknown';
        setSelectedDeviceId(usedDeviceId);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }

        setCameraState({ status: 'active', stream, deviceId: usedDeviceId });

        // Enumerate devices after permission granted (labels become available)
        const devList = await enumerateVideoDevices();
        setDevices(devList);
      } catch (err) {
        setCameraState({ status: 'error', error: err as import('./cameraTypes').CameraError });
      }
    },
    [facingMode, resolution, selectedDeviceId],
  );

  const selectDevice = useCallback(
    async (deviceId: string) => {
      setSelectedDeviceId(deviceId);
      await start(deviceId);
    },
    [start],
  );

  const switchCamera = useCallback(async () => {
    if (devices.length < 2) return;
    const currentIdx = devices.findIndex((d) => d.deviceId === selectedDeviceId);
    const nextDevice = devices[(currentIdx + 1) % devices.length];
    await selectDevice(nextDevice.deviceId);
  }, [devices, selectedDeviceId, selectDevice]);

  useEffect(() => {
    if (autoStart) {
      start();
    }
    return () => {
      stopStream(streamRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    cameraState,
    devices,
    selectedDeviceId,
    start,
    stop,
    switchCamera,
    selectDevice,
    attachToVideo,
  };
}
