import type {
  CameraError,
  VideoDevice,
  ResolutionPreset,
} from './cameraTypes';
import { RESOLUTION_CONSTRAINTS } from './cameraTypes';

function classifyError(err: unknown): CameraError {
  if (!(err instanceof Error)) {
    return { code: 'UNKNOWN', message: String(err) };
  }
  const name = err.name;
  const msg = err.message.toLowerCase();

  if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
    return {
      code: 'INSECURE_CONTEXT',
      message: 'Camera requires HTTPS. Please access the app over a secure connection.',
    };
  }
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return {
      code: 'PERMISSION_DENIED',
      message: 'Camera permission was denied. Please allow camera access and reload.',
    };
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return { code: 'NO_CAMERA', message: 'No camera was found on this device.' };
  }
  if (name === 'NotReadableError' || msg.includes('in use') || msg.includes('already')) {
    return {
      code: 'IN_USE',
      message: 'Camera is already in use by another app. Please close it and try again.',
    };
  }
  if (name === 'TypeError' || !navigator.mediaDevices) {
    return {
      code: 'NOT_SUPPORTED',
      message: 'Your browser does not support camera access.',
    };
  }
  return { code: 'UNKNOWN', message: err.message || 'Unknown camera error.' };
}

export async function requestCameraStream(
  deviceId: string | undefined,
  facingMode: 'user' | 'environment',
  resolution: ResolutionPreset,
): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw classifyError(
      Object.assign(new TypeError('getUserMedia not supported'), { name: 'TypeError' }),
    );
  }

  const resConstraints = RESOLUTION_CONSTRAINTS[resolution];

  const constraints: MediaStreamConstraints = {
    video: deviceId
      ? { deviceId: { exact: deviceId }, ...resConstraints }
      : { facingMode, ...resConstraints },
    audio: false,
  };

  try {
    return await navigator.mediaDevices.getUserMedia(constraints);
  } catch (err) {
    throw classifyError(err);
  }
}

export async function enumerateVideoDevices(): Promise<VideoDevice[]> {
  if (!navigator.mediaDevices?.enumerateDevices) return [];
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices
      .filter((d) => d.kind === 'videoinput')
      .map((d) => {
        const label = d.label || `Camera ${d.deviceId.slice(0, 6)}`;
        const facing: VideoDevice['facing'] = label.toLowerCase().includes('front')
          || label.toLowerCase().includes('user')
          ? 'user'
          : label.toLowerCase().includes('back') || label.toLowerCase().includes('environment')
            ? 'environment'
            : 'unknown';
        return { deviceId: d.deviceId, label, facing };
      });
  } catch {
    return [];
  }
}

export function stopStream(stream: MediaStream | null): void {
  if (!stream) return;
  stream.getTracks().forEach((t) => t.stop());
}
