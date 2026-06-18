// ─── Image reference ────────────────────────────────────────────────────────

export type ImageKind = 'asset' | 'indexeddb' | 'dataUrl' | 'external';

export interface LessonImageRef {
  kind: ImageKind;
  /** For 'asset': filename in /public/starter-assets/
   *  For 'indexeddb': imageId stored in DB
   *  For 'dataUrl': full data URL
   *  For 'external': https URL */
  value: string;
}

// ─── Lesson data model ───────────────────────────────────────────────────────

export interface QuizChoice {
  id: string;
  label?: string;
  image?: LessonImageRef;
  altText?: string;
}

export interface QuizQuestion {
  id: string;
  prompt: string;
  promptLanguage?: string;
  answerText?: string;
  explanation?: string;
  left: QuizChoice;
  right: QuizChoice;
  correctSide: 'left' | 'right';
  difficulty?: 'easy' | 'medium' | 'hard';
  tags?: string[];
}

export type PackKind = 'solo' | 'challenge';

export interface LessonPack {
  id: string;
  schemaVersion: 1;
  title: string;
  description?: string;
  languagePair?: string;
  durationSeconds: number;
  questionOrder: 'random' | 'sequential';
  showAnswerTextAfterResponse: boolean;
  allowTouchFallback: boolean;
  /** solo = built-in or personal play; challenge = host-shared pack */
  packKind?: PackKind;
  /** Stable id for challenge result grouping */
  challengeId?: string;
  /** Optional logo shown on Play / Home topic lists */
  icon?: LessonImageRef;
  createdAt: string;
  updatedAt: string;
  questions: QuizQuestion[];
}

// ─── Result / session model ──────────────────────────────────────────────────

export type InputMethod = 'pose' | 'hand' | 'touch' | 'keyboard';

export interface QuestionResult {
  questionId: string;
  prompt: string;
  correctSide: 'left' | 'right';
  selectedSide?: 'left' | 'right';
  isCorrect: boolean;
  responseTimeMs?: number;
  inputMethod: InputMethod;
}

export type PlayMode = 'solo' | 'challenge';

export interface ScoreProof {
  message: string;
  signatureBase58: string;
  walletAddress: string;
  signedAt: string;
}

export interface ResultSession {
  id: string;
  lessonId: string;
  lessonTitle: string;
  playMode?: PlayMode;
  challengeId?: string;
  challengeName?: string;
  walletAddress?: string;
  scoreProof?: ScoreProof;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  score: number;
  correctCount: number;
  wrongCount: number;
  skippedCount: number;
  totalAnswered: number;
  accuracy: number;
  questionResults: QuestionResult[];
  deviceInfo?: {
    userAgent?: string;
    approximateFps?: number;
    cameraResolution?: string;
  };
}

// ─── App settings ────────────────────────────────────────────────────────────

export type CameraResolutionPreset = 'performance' | 'balanced' | 'quality';

/** How gesture hit detection maps to answer cards */
export type SelectionMode =
  | 'card-centered-target'
  | 'strict-card-target'
  | 'wide-zone-debug'
  | 'debug-touch';

/** Expanded card target margin + hold presets */
export type TargetSensitivity = 'strict' | 'normal' | 'easy';

/** @deprecated Use SelectionMode */
export type InputMode = 'gesture-only' | 'gesture-plus-touch' | 'touch-only-debug';

/** @deprecated Use TargetSensitivity */
export type SensitivityPreset = 'low' | 'normal' | 'high' | 'custom';

export interface GestureThresholds {
  poseVisibilityMin: number;
  neutralZonePercent: number;
  leftZoneMaxPercent: number;
  rightZoneMinPercent: number;
  minHoldMs: number;
  cooldownMs: number;
  minArmExtensionPercent: number;
}

export interface AppSettings {
  mirrorCamera: boolean;
  cameraFacingMode: 'user' | 'environment';
  cameraResolution: CameraResolutionPreset;
  enableHandLandmarker: boolean;
  showDebugOverlay: boolean;
  enableSoundEffects: boolean;
  /** Photo moments between questions (local only). Default on; disable in Advanced for QA. */
  enablePhotoMiniGame: boolean;
  /** Default: card-centered expanded targets around answer cards */
  selectionMode: SelectionMode;
  targetSensitivity: TargetSensitivity;
  customThresholds?: Partial<GestureThresholds>;
  lastUsedLessonId?: string;
  /** @deprecated migrated to selectionMode */
  inputMode?: InputMode;
  /** @deprecated migrated to targetSensitivity */
  sensitivityPreset?: SensitivityPreset;
}

export const DEFAULT_SETTINGS: AppSettings = {
  mirrorCamera: true,
  cameraFacingMode: 'user',
  cameraResolution: 'balanced',
  enableHandLandmarker: true,
  showDebugOverlay: false,
  enableSoundEffects: true,
  enablePhotoMiniGame: false,
  selectionMode: 'card-centered-target',
  targetSensitivity: 'normal',
};
