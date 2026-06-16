import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useCamera } from '@/camera/useCamera';
import { useVisionDetection } from '@/vision/useVisionDetection';
import { useTargetZones } from '@/vision/useTargetZones';
import type { TargetZoneSet } from '@/vision/targetZones';
import { DEFAULT_CALIBRATION } from '@/vision/calibration';
import type { CalibrationProfile } from '@/vision/types';
import { gameReducer, createInitialGameState } from '@/game/gameReducer';
import { buildQuestionQueue } from '@/game/questionEngine';
import { buildResultSession } from '@/game/sessionRecorder';
import {
  isTouchInputAllowed,
  isGestureInputAllowed,
  isKeyboardInputAllowed,
} from '@/game/inputMode';
import type { QuestionResult, InputMethod, LessonPack, AppSettings } from '@/storage/types';
import { getLesson } from '@/storage/lessonStorage';
import { getSettings } from '@/storage/settingsStorage';
import { saveResultSession } from '@/storage/resultStorage';
import { generateId, nowIso } from '@/utils/ids';
import { TimerBadge } from '@/components/game/TimerBadge';
import { ScoreBadge } from '@/components/game/ScoreBadge';
import { ChoiceCard } from '@/components/game/ChoiceCard';
import { GestureStatus } from '@/components/game/GestureStatus';
import { FeedbackOverlay } from '@/components/game/FeedbackOverlay';
import { ResultModal } from '@/components/game/ResultModal';
import { PhotoCaptureMiniGame } from '@/components/game/PhotoCaptureMiniGame';
import { DebugOverlay } from '@/components/game/DebugOverlay';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorMessage } from '@/components/common/ErrorMessage';
import { setSessionPhotos as storeSessionPhotos } from '@/game/sessionPhotoCache';
import {
  resolvePostFeedbackPhotoAction,
  type PhotoResumeMode,
} from '@/game/sessionPhotoSchedule';
import { calibrationForFacing } from '@/camera/cameraSetup';
import { usePlayFlowLandscape } from '@/camera/usePlayFlowLandscape';
import {
  PLAY_FLOW_CARD_LEFT,
  PLAY_FLOW_CARD_RIGHT,
  PLAY_FLOW_GESTURE_STATUS,
  PLAY_FLOW_PROMPT_BAND,
  PLAY_FLOW_TOP_BAR,
  PLAY_FLOW_VIEWPORT,
} from '@/camera/playFlowLayout';
import { RotateToLandscapePrompt } from '@/components/game/RotateToLandscapePrompt';

const FEEDBACK_DURATION_MS = 550;
const CORRECT_ANSWER_PAUSE_MS = 2000;

export function GamePage() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { showRotatePrompt } = usePlayFlowLandscape();

  const calibration: CalibrationProfile =
    location.state?.calibration ?? DEFAULT_CALIBRATION;

  const sessionPlayMode = location.state?.playMode as 'solo' | 'challenge' | undefined;
  const sessionChallengeId = location.state?.challengeId as string | undefined;
  const sessionChallengeName = location.state?.challengeName as string | undefined;

  const [gameState, dispatch] = useReducer(gameReducer, undefined, createInitialGameState);
  const [lesson, setLesson] = useState<LessonPack | null>(null);
  const playMetaRef = useRef({
    playMode: sessionPlayMode ?? 'solo' as const,
    challengeId: sessionChallengeId,
    challengeName: sessionChallengeName,
  });

  useEffect(() => {
    playMetaRef.current = {
      playMode: sessionPlayMode ?? (lesson?.packKind === 'challenge' ? 'challenge' : 'solo'),
      challengeId: sessionChallengeId ?? lesson?.challengeId,
      challengeName: sessionChallengeName ?? lesson?.title,
    };
  }, [sessionPlayMode, sessionChallengeId, sessionChallengeName, lesson]);

  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
  const [questionResults, setQuestionResults] = useState<QuestionResult[]>([]);
  const [resultSaved, setResultSaved] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [videoReady, setVideoReady] = useState(false);

  const [sessionPhotos, setSessionPhotos] = useState<string[]>([]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const leftChoiceRef = useRef<HTMLDivElement>(null);
  const rightChoiceRef = useRef<HTMLDivElement>(null);
  const targetZonesRef = useRef<TargetZoneSet | null>(null);
  const gameStateRef = useRef(gameState);
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const advanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastLockedSideRef = useRef<string | null>(null);
  const timerLastRef = useRef(performance.now());
  const photoResumeRef = useRef<PhotoResumeMode>('next');

  gameStateRef.current = gameState;

  const appSettingsRef = useRef(appSettings);
  appSettingsRef.current = appSettings;

  const { cameraState, start, stop } = useCamera({
    facingMode: appSettings?.cameraFacingMode ?? 'user',
    resolution: appSettings?.cameraResolution ?? 'balanced',
  });

  const selectionMode = appSettings?.selectionMode ?? 'card-centered-target';
  const targetSensitivity = appSettings?.targetSensitivity ?? 'normal';
  const touchAllowed =
    lesson != null && isTouchInputAllowed(selectionMode, lesson.allowTouchFallback);
  const gestureAllowed = isGestureInputAllowed(selectionMode);
  const keyboardAllowed = isKeyboardInputAllowed(selectionMode);
  const isPlaying = gameState.status === 'playing';
  const isPhotoCapture = gameState.status === 'photo-capture';

  const targetZones = useTargetZones(
    containerRef,
    leftChoiceRef,
    rightChoiceRef,
    selectionMode,
    targetSensitivity,
    [gameState.currentIndex, gameState.status],
  );
  targetZonesRef.current = targetZones;

  const cameraFacing = appSettings?.cameraFacingMode ?? 'user';
  const liveCalibration = useMemo(
    () => calibrationForFacing(calibration, cameraFacing),
    [calibration, cameraFacing],
  );

  const { gestureOutput, diagnostics, resetGesture } = useVisionDetection({
    videoRef,
    containerRef,
    calibration: liveCalibration,
    cameraState,
    enableHandLandmarker: appSettings?.enableHandLandmarker ?? true,
    targetSensitivity,
    gestureSubmissionEnabled: gestureAllowed && isPlaying,
    active: isPlaying,
    targetZonesRef,
  });

  // Load lesson + settings; delay game start until ready
  useEffect(() => {
    let mounted = true;
    async function init() {
      try {
        const [loadedLesson, settings] = await Promise.all([
          getLesson(lessonId!),
          getSettings(),
        ]);
        if (!loadedLesson) throw new Error('Lesson not found');
        if (!mounted) return;

        setLesson(loadedLesson);
        setAppSettings(settings);
        setDebugMode(settings.showDebugOverlay);

        const questions = buildQuestionQueue(
          loadedLesson.questions,
          loadedLesson.questionOrder,
          loadedLesson.durationSeconds,
        );

        dispatch({
          type: 'START',
          payload: {
            questions,
            lessonId: loadedLesson.id,
            lessonTitle: loadedLesson.title,
            durationSeconds: loadedLesson.durationSeconds,
            sessionId: generateId(),
            startedAt: nowIso(),
          },
        });
        setLoading(false);
      } catch (e) {
        if (mounted) setLoadError(e instanceof Error ? e.message : String(e));
      }
    }
    init();
    return () => { mounted = false; };
  }, [lessonId]);

  // Camera lifecycle
  useEffect(() => {
    if (!loading) start();
    return () => {
      stop();
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
      if (advanceTimeoutRef.current) clearTimeout(advanceTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  useEffect(() => {
    if (cameraState.status === 'active' && videoRef.current) {
      videoRef.current.srcObject = cameraState.stream;
      videoRef.current.play().catch(() => {});
    }
  }, [cameraState]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onMeta = () => setVideoReady(video.readyState >= 2);
    onMeta();
    video.addEventListener('loadedmetadata', onMeta);
    return () => video.removeEventListener('loadedmetadata', onMeta);
  }, [cameraState.status]);

  const startScheduledPhoto = useCallback((resume: PhotoResumeMode) => {
    photoResumeRef.current = resume;
    dispatch({ type: 'START_PHOTO_CAPTURE' });
  }, []);

  const submitAnswer = useCallback((side: 'left' | 'right', method: InputMethod) => {
    const gs = gameStateRef.current;
    if (gs.status !== 'playing' || !gs.activeQuestion) return;

    resetGesture();
    lastLockedSideRef.current = null;

    const q = gs.activeQuestion.question;
    const isCorrect = side === q.correctSide;

    dispatch({ type: 'SUBMIT_ANSWER', payload: { side, inputMethod: method } });

    setQuestionResults((prev) => [
      ...prev,
      {
        questionId: q.id,
        prompt: q.prompt,
        correctSide: q.correctSide,
        selectedSide: side,
        isCorrect,
        inputMethod: method,
      },
    ]);

    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    if (advanceTimeoutRef.current) clearTimeout(advanceTimeoutRef.current);

    feedbackTimeoutRef.current = setTimeout(() => {
      const current = gameStateRef.current;
      const answeredIndex = current.currentIndex;
      const total = current.questionQueue.length;
      const action = resolvePostFeedbackPhotoAction(answeredIndex, total);

      if (action === 'photo-then-finish') {
        startScheduledPhoto('finish');
        return;
      }
      if (action === 'photo-then-next') {
        startScheduledPhoto('next');
        return;
      }

      const advance = () => {
        resetGesture();
        lastLockedSideRef.current = null;
        dispatch({ type: 'NEXT_QUESTION' });
      };

      if (isCorrect && action === 'next') {
        const extraPause = CORRECT_ANSWER_PAUSE_MS - FEEDBACK_DURATION_MS;
        if (extraPause > 0) {
          advanceTimeoutRef.current = setTimeout(advance, extraPause);
          return;
        }
      }

      advance();
    }, FEEDBACK_DURATION_MS);
  }, [resetGesture, startScheduledPhoto]);

  const handlePhotoComplete = useCallback((photoDataUrl: string | null) => {
    if (photoDataUrl) setSessionPhotos((prev) => [...prev, photoDataUrl]);
    resetGesture();
    dispatch({ type: 'END_PHOTO_CAPTURE', payload: { mode: photoResumeRef.current } });
  }, [resetGesture]);

  // Gesture lock → submit (primary input)
  useEffect(() => {
    if (!gestureAllowed || !isPlaying) return;
    const locked = gestureOutput.lockedSide;
    if (!locked) return;
    // Prevent double-submit from same lock event
    const key = `${gestureOutput.lockEventId ?? locked}-${gestureOutput.debug?.source ?? 'pose'}`;
    if (lastLockedSideRef.current === key) return;
    lastLockedSideRef.current = key;

    const method: InputMethod =
      gestureOutput.debug?.source === 'hand' ? 'hand' : 'pose';
    submitAnswer(locked, method);
  }, [gestureOutput.lockEventId, gestureOutput.lockedSide, gestureOutput.debug?.source, gestureAllowed, isPlaying, submitAnswer]);

  // Timer tick (separate from vision loop)
  useEffect(() => {
    if (!isPlaying) return;
    timerLastRef.current = performance.now();
    const id = window.setInterval(() => {
      const now = performance.now();
      const elapsed = now - timerLastRef.current;
      timerLastRef.current = now;
      dispatch({ type: 'TICK', payload: { elapsedMs: elapsed } });
    }, 250);
    return () => clearInterval(id);
  }, [isPlaying]);

  // Save results
  useEffect(() => {
    if (gameState.status === 'finished' && !resultSaved && gameState.sessionId) {
      saveResultSession(
        buildResultSession(
          gameState,
          questionResults,
          diagnostics.fps,
          diagnostics.cameraResolution ?? undefined,
          {
            playMode: playMetaRef.current.playMode,
            challengeId: playMetaRef.current.challengeId,
            challengeName: playMetaRef.current.challengeName,
          },
        ),
      ).catch(console.error);
      setResultSaved(true);
    }
  }, [gameState, resultSaved, questionResults, diagnostics.fps, diagnostics.cameraResolution]);

  useEffect(() => {
    if (gameState.status === 'finished' && gameState.sessionId) {
      storeSessionPhotos(gameState.sessionId, sessionPhotos);
    }
  }, [gameState.status, gameState.sessionId, sessionPhotos]);

  // Keyboard (debug mode only)
  useEffect(() => {
    if (!keyboardAllowed) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') submitAnswer('left', 'keyboard');
      if (e.key === 'ArrowRight') submitAnswer('right', 'keyboard');
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [keyboardAllowed, submitAnswer]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        e.preventDefault();
        if (gameState.status === 'playing') dispatch({ type: 'PAUSE' });
        else if (gameState.status === 'paused') dispatch({ type: 'RESUME' });
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [gameState.status]);

  const handlePlayAgain = () => {
    setResultSaved(false);
    setQuestionResults([]);
    setSessionPhotos([]);
    resetGesture();
    navigate(`/play/${lessonId}/gesture-test`, { state: { calibration } });
  };

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <ErrorMessage title="Failed to load game" message={loadError} onRetry={() => navigate('/play')} />
      </div>
    );
  }

  if (loading || !lesson || gameState.status === 'idle') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <LoadingSpinner label="Loading game…" size="lg" />
      </div>
    );
  }

  const activeQ = gameState.activeQuestion?.question;
  const isMirrored = liveCalibration.mirrored;
  const displayW = containerRef.current?.offsetWidth ?? window.innerWidth;
  const displayH = containerRef.current?.offsetHeight ?? window.innerHeight;
  const videoW = videoRef.current?.videoWidth ?? 0;
  const videoH = videoRef.current?.videoHeight ?? 0;

  return (
    <div ref={containerRef} className={PLAY_FLOW_VIEWPORT}>
      <video
        ref={videoRef}
        className={`absolute inset-0 h-full w-full object-cover ${isMirrored ? 'scale-x-[-1]' : ''}`}
        autoPlay
        playsInline
        muted
      />

      {!videoReady && cameraState.status !== 'error' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20">
          <LoadingSpinner label="Starting camera…" />
        </div>
      )}

      {cameraState.status === 'error' && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-800 z-10">
          <p className="text-white/60 text-sm px-6 text-center">
            Camera unavailable.
            {touchAllowed
              ? ' Touch fallback is enabled. Tap a choice to answer.'
              : ' Enable touch fallback in Settings to answer without gestures.'}
          </p>
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/50 pointer-events-none" />

      {/* Top bar — 3-column grid keeps timer visually centered */}
      <div className={PLAY_FLOW_TOP_BAR}>
        <div className="flex justify-start">
          <button
            onClick={() => { dispatch({ type: 'END' }); stop(); navigate('/play'); }}
            className="btn btn-secondary btn-sm text-sm"
          >
            ✕
          </button>
        </div>
        <div className="flex justify-center">
          <TimerBadge remainingMs={gameState.remainingMs} />
        </div>
        <div className="flex items-center justify-end gap-2">
          {gameState.status === 'playing' && (
            <button onClick={() => dispatch({ type: 'PAUSE' })} className="btn btn-secondary btn-sm">
              ⏸
            </button>
          )}
          <ScoreBadge score={gameState.score} />
          {sessionPhotos.length > 0 && (
            <span className="rounded-xl bg-pink-600/80 px-2 py-1 text-xs font-bold text-white" title="Photo moments this round">
              📸 {sessionPhotos.length}/3
            </span>
          )}
        </div>
      </div>

      {/* Input mode badge (debug / touch modes) */}
      {selectionMode !== 'card-centered-target' && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-10 rounded-lg bg-amber-600/80 px-3 py-1 text-xs font-bold text-white">
          {selectionMode === 'debug-touch' ? 'Debug: touch only' :
           selectionMode === 'wide-zone-debug' ? 'Debug: wide zones' :
           selectionMode === 'strict-card-target' ? 'Strict card targets' : selectionMode}
        </div>
      )}

      {activeQ && gameState.status !== 'finished' && !isPhotoCapture && (
        <div className={PLAY_FLOW_PROMPT_BAND}>
          <div className="rounded-2xl bg-black/60 px-4 py-2 sm:px-6 sm:py-3 backdrop-blur max-w-3xl">
            <p className="text-lg font-black text-white text-center drop-shadow-lg sm:text-2xl line-clamp-3">
              {activeQ.prompt}
            </p>
          </div>
        </div>
      )}

      {activeQ && gameState.status !== 'finished' && gameState.status !== 'paused' && !isPhotoCapture && (
        <div className="absolute inset-0 z-10 pointer-events-none">
          <div className={PLAY_FLOW_CARD_LEFT}>
            <ChoiceCard
              ref={leftChoiceRef}
              choice={activeQ.left}
              side="left"
              touchEnabled={touchAllowed && isPlaying}
              holdProgress={gestureOutput.candidateSide === 'left' ? gestureOutput.holdProgress : 0}
              isCandidate={gestureOutput.candidateSide === 'left'}
              feedbackState={
                gameState.status === 'feedback' && gameState.feedback
                  ? gameState.feedback.selectedSide === 'left'
                    ? gameState.feedback.isCorrect ? 'correct' : 'wrong'
                    : activeQ.correctSide === 'left' ? 'correct' : 'neutral'
                  : 'neutral'
              }
              onTouch={() => touchAllowed && submitAnswer('left', 'touch')}
            />
          </div>
          <div className={PLAY_FLOW_CARD_RIGHT}>
            <ChoiceCard
              ref={rightChoiceRef}
              choice={activeQ.right}
              side="right"
              touchEnabled={touchAllowed && isPlaying}
              holdProgress={gestureOutput.candidateSide === 'right' ? gestureOutput.holdProgress : 0}
              isCandidate={gestureOutput.candidateSide === 'right'}
              feedbackState={
                gameState.status === 'feedback' && gameState.feedback
                  ? gameState.feedback.selectedSide === 'right'
                    ? gameState.feedback.isCorrect ? 'correct' : 'wrong'
                    : activeQ.correctSide === 'right' ? 'correct' : 'neutral'
                  : 'neutral'
              }
              onTouch={() => touchAllowed && submitAnswer('right', 'touch')}
            />
          </div>
        </div>
      )}

      {isPlaying && (
        <div className={PLAY_FLOW_GESTURE_STATUS}>
          <GestureStatus
            gestureOutput={gestureOutput}
            diagnostics={diagnostics}
            gestureInputEnabled={gestureAllowed}
            touchFallbackActive={touchAllowed}
          />
        </div>
      )}

      {gameState.status === 'feedback' && gameState.feedback && activeQ && (
        <FeedbackOverlay
          feedback={gameState.feedback}
          answerText={activeQ.answerText}
          showAnswerText={lesson.showAnswerTextAfterResponse}
        />
      )}

      {isPhotoCapture && (
        <PhotoCaptureMiniGame
          videoRef={videoRef}
          containerRef={containerRef}
          mirrored={isMirrored}
          onComplete={handlePhotoComplete}
        />
      )}

      {gameState.status === 'paused' && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/70 gap-4">
          <p className="text-4xl font-black text-white">Paused</p>
          <button onClick={() => dispatch({ type: 'RESUME' })} className="btn btn-primary btn-xl">
            Resume
          </button>
          <button onClick={() => { stop(); navigate('/play'); }} className="btn btn-secondary btn-md">
            Quit Game
          </button>
        </div>
      )}

      {debugMode && !isPhotoCapture && (
        <DebugOverlay
          diagnostics={diagnostics}
          mirrored={isMirrored}
          displayWidth={displayW}
          displayHeight={displayH}
          videoWidth={videoW}
          videoHeight={videoH}
          targetZones={targetZones}
        />
      )}

      <button
        onClick={() => setDebugMode((d) => !d)}
        className="absolute bottom-2 right-2 z-50 rounded-xl bg-black/60 px-2 py-1 text-xs text-white/50 hover:text-white"
      >
        {debugMode ? 'Debug Off' : 'Debug'}
      </button>

      {showRotatePrompt && gameState.status !== 'finished' && gameState.status !== 'photo-capture' && (
        <RotateToLandscapePrompt />
      )}

      {gameState.status === 'finished' && (
        <ResultModal
          state={gameState}
          sessionId={gameState.sessionId}
          lessonId={lessonId!}
          sessionPhotos={sessionPhotos}
          onPlayAgain={handlePlayAgain}
        />
      )}
    </div>
  );
}
