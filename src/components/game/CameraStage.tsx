import { useEffect, useRef } from 'react';

interface Props {
  stream: MediaStream | null;
  mirrored?: boolean;
  className?: string;
}

/**
 * Full-screen camera background.
 * The video element is always mirrored if `mirrored=true` via CSS so the
 * student sees a selfie-style preview.
 */
export function CameraStage({ stream, mirrored = true, className = '' }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
    return () => {
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, [stream]);

  return (
    <video
      ref={videoRef}
      className={`h-full w-full object-cover ${mirrored ? 'scale-x-[-1]' : ''} ${className}`}
      autoPlay
      playsInline
      muted
      aria-label="Camera feed"
    />
  );
}
