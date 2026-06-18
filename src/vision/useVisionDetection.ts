import { useCallback, useEffect, useRef, useState } from 'react';
import { PoseLandmarkerService } from '@/vision/poseLandmarker';
import { HandLandmarkerService } from '@/vision/handLandmarker';
import { runGestureSelector, resetGestureState } from '@/vision/gestureSelector';
import { isTooCloseToCamera, isPoseConfident } from '@/vision/gestureSelector';
import { resolveGestureDisplayOutput } from '@/vision/gestureDisplay';
import { computeBodyCenterX } from '@/vision/landmarkUtils';
import { PerformanceMonitor } from '@/vision/performanceMonitor';
import type { CalibrationProfile, GestureSelectorOutput, GestureSelectorState, GestureSettings } from '@/vision/types';
import { PRESET_THRESHOLDS } from '@/vision/types';
import { PoseLandmarkIndex } from '@/vision/types';
import type { DetectionDiagnostics } from '@/vision/detectionTypes';
import { createEmptyDiagnostics } from '@/vision/detectionTypes';
import type { CameraState } from '@/camera/cameraTypes';
import type { TargetSensitivity } from '@/storage/types';
import { getMinArmExtension, getTargetHoldMs } from '@/vision/targetSensitivity';

export interface UseVisionDetectionOptions {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  containerRef: React.RefObject<HTMLElement | null>;
  calibration: CalibrationProfile;
  cameraState: CameraState;
  enableHandLandmarker: boolean;
  targetSensitivity: TargetSensitivity;
  gestureSubmissionEnabled: boolean;
  active: boolean;
  targetZonesRef: React.RefObject<import('./targetZones').TargetZoneSet | null>;
  requiredSide?: 'left' | 'right';
}

export interface UseVisionDetectionReturn {
  gestureOutput: GestureSelectorOutput;
  diagnostics: DetectionDiagnostics;
  resetGesture: () => void;
  poseLandmarkerRef: React.RefObject<PoseLandmarkerService>;
  handLandmarkerRef: React.RefObject<HandLandmarkerService | null>;
}

export function useVisionDetection(options: UseVisionDetectionOptions): UseVisionDetectionReturn {
  const {
    videoRef,
    containerRef,
    calibration,
    cameraState,
    enableHandLandmarker,
    targetSensitivity,
    gestureSubmissionEnabled,
    active,
    targetZonesRef,
    requiredSide,
  } = options;

  const poseLandmarkerRef = useRef(new PoseLandmarkerService());
  const handLandmarkerRef = useRef<HandLandmarkerService | null>(null);
  const gestureStateRef = useRef<GestureSelectorState>(resetGestureState());
  const perfMonRef = useRef(new PerformanceMonitor());
  const animFrameRef = useRef<number>(0);
  const inferenceBusyRef = useRef(false);
  const videoReadyRef = useRef(false);
  const lastDetectionTsRef = useRef<number | null>(null);
  const lastGestureOutputRef = useRef<GestureSelectorOutput>({
    confidence: 0,
    holdProgress: 0,
  });

  const [gestureOutput, setGestureOutput] = useState<GestureSelectorOutput>({
    confidence: 0,
    holdProgress: 0,
  });
  const [diagnostics, setDiagnostics] = useState<DetectionDiagnostics>(createEmptyDiagnostics());

  const resetGesture = useCallback(() => {
    gestureStateRef.current = resetGestureState();
  }, []);

  const getSettings = useCallback((): GestureSettings => {
    const base = PRESET_THRESHOLDS.normal;
    return {
      ...base,
      minHoldMs: getTargetHoldMs(targetSensitivity),
      minArmExtensionPercent: getMinArmExtension(targetSensitivity),
    };
  }, [targetSensitivity]);

  useEffect(() => {
    const pose = poseLandmarkerRef.current;
    pose.load().catch(() => {});

    if (enableHandLandmarker) {
      const hand = new HandLandmarkerService();
      handLandmarkerRef.current = hand;
      hand.load().catch(() => {});
    }

    return () => {
      pose.close();
      handLandmarkerRef.current?.close();
      handLandmarkerRef.current = null;
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [enableHandLandmarker]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onReady = () => {
      videoReadyRef.current = video.readyState >= 2 && video.videoWidth > 0;
    };
    onReady();
    video.addEventListener('loadedmetadata', onReady);
    video.addEventListener('loadeddata', onReady);
    return () => {
      video.removeEventListener('loadedmetadata', onReady);
      video.removeEventListener('loadeddata', onReady);
    };
  }, [videoRef, cameraState]);

  useEffect(() => {
    let running = true;

    const tick = () => {
      if (!running) return;

      const now = performance.now();
      const video = videoRef.current;
      const pose = poseLandmarkerRef.current;
      const hand = handLandmarkerRef.current;

      const camReady = cameraState.status === 'active';
      const poseStatus = pose.getStatus();
      const handStatus = hand?.getStatus() ?? 'idle';

      let poseLandmarks = null as import('@/vision/types').Landmark[] | null;
      let handLandmarks = null as import('@/vision/types').Landmark[][] | null;
      let output: GestureSelectorOutput = { confidence: 0, holdProgress: 0 };
      let inferenceRan = false;

      const canInfer =
        active &&
        camReady &&
        video &&
        videoReadyRef.current &&
        poseStatus === 'ready' &&
        !inferenceBusyRef.current;

      if (canInfer) {
        inferenceBusyRef.current = true;
        try {
          poseLandmarks = pose.detectForVideo(video, now);
          if (hand && handStatus === 'ready' && enableHandLandmarker) {
            handLandmarks = hand.detectForVideo(video, now);
          }

          const rect = containerRef.current?.getBoundingClientRect();
          const displayWidth = rect?.width ?? window.innerWidth;
          const displayHeight = rect?.height ?? window.innerHeight;
          const videoWidth = video.videoWidth;
          const videoHeight = video.videoHeight;

          const { output: o, nextState } = runGestureSelector(
            {
              poseLandmarks: poseLandmarks ?? undefined,
              handLandmarks: handLandmarks ?? undefined,
              timestampMs: now,
              displayWidth,
              displayHeight,
              videoWidth,
              videoHeight,
              mirrored: calibration.mirrored,
              calibration,
              settings: getSettings(),
              targetZones: targetZonesRef.current ?? undefined,
              requiredSide,
              allowPoseHoldStart: !enableHandLandmarker,
            },
            gestureStateRef.current,
          );
          gestureStateRef.current = nextState;
          output = o;
          lastGestureOutputRef.current = o;
          inferenceRan = true;
          perfMonRef.current.tick();
          lastDetectionTsRef.current = now;
        } finally {
          inferenceBusyRef.current = false;
        }
      }

      const settings = getSettings();
      const visMin = settings.poseVisibilityMin;
      const personDetected =
        (poseLandmarks != null && poseLandmarks.length > 0) ||
        (handLandmarks != null && handLandmarks.length > 0);

      output = resolveGestureDisplayOutput(
        inferenceRan,
        output,
        gestureStateRef.current,
        lastGestureOutputRef.current,
        settings.minHoldMs,
      );
      if (inferenceRan) {
        lastGestureOutputRef.current = output;
      }

      const lwVis = poseLandmarks?.[PoseLandmarkIndex.LEFT_WRIST]?.visibility ?? null;
      const rwVis = poseLandmarks?.[PoseLandmarkIndex.RIGHT_WRIST]?.visibility ?? null;
      const lsVis = poseLandmarks?.[PoseLandmarkIndex.LEFT_SHOULDER]?.visibility ?? null;
      const rsVis = poseLandmarks?.[PoseLandmarkIndex.RIGHT_SHOULDER]?.visibility ?? null;

      const bodyCenterX =
        poseLandmarks && poseLandmarks.length >= 17
          ? computeBodyCenterX(poseLandmarks, visMin)
          : null;

      const tooClose = isTooCloseToCamera(poseLandmarks ?? undefined);
      const handsOutside =
        personDetected &&
        poseLandmarks != null &&
        !isPoseConfident(poseLandmarks, visMin) &&
        (!handLandmarks || handLandmarks.length === 0);

      const track = video?.srcObject instanceof MediaStream
        ? video.srcObject.getVideoTracks()[0]
        : null;
      const settingsTrack = track?.getSettings();
      const resStr = settingsTrack
        ? `${settingsTrack.width ?? '?'}×${settingsTrack.height ?? '?'}`
        : null;

      const detectionSource =
        output.debug?.source === 'hand'
          ? 'hand'
          : output.debug?.source === 'pose'
            ? 'pose'
            : poseLandmarks
              ? 'pose'
              : handLandmarks
                ? 'hand'
                : 'none';

      setGestureOutput(output);
      setDiagnostics({
        cameraStatus: camReady ? 'ready' : cameraState.status === 'error' ? 'error' : cameraState.status === 'requesting' ? 'requesting' : 'idle',
        poseModelStatus:
          poseStatus === 'ready' ? 'ready' : poseStatus === 'error' ? 'failed' : poseStatus === 'loading' ? 'loading' : 'idle',
        handModelStatus: !enableHandLandmarker
          ? 'idle'
          : handStatus === 'ready'
            ? 'ready'
            : handStatus === 'error'
              ? 'failed'
              : handStatus === 'loading'
                ? 'loading'
                : 'idle',
        inferenceRunning: inferenceRan,
        personDetected,
        poseLandmarkCount: poseLandmarks?.length ?? 0,
        handCount: handLandmarks?.length ?? 0,
        leftWristVisibility: lwVis,
        rightWristVisibility: rwVis,
        leftShoulderVisibility: lsVis,
        rightShoulderVisibility: rsVis,
        bodyCenterX,
        detectionSource: detectionSource as DetectionDiagnostics['detectionSource'],
        tooClose,
        handsOutsideFrame: handsOutside,
        lastDetectionTimestampMs: lastDetectionTsRef.current,
        cooldownActive: output.reason === 'cooldown',
        fps: perfMonRef.current.getFps(),
        cameraResolution: resStr,
        gestureOutput: output,
        poseLandmarks,
        handLandmarks,
        targetZones: targetZonesRef.current,
      });

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);
    return () => {
      running = false;
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [
    active,
    calibration,
    cameraState,
    containerRef,
    enableHandLandmarker,
    gestureSubmissionEnabled,
    getSettings,
    videoRef,
    targetZonesRef,
    requiredSide,
  ]);

  return {
    gestureOutput,
    diagnostics,
    resetGesture,
    poseLandmarkerRef,
    handLandmarkerRef,
  };
}
