import type {
  GestureSelectorInput,
  GestureSelectorOutput,
  GestureSelectorState,
  Landmark,
} from './types';
import type { TargetZoneSet } from './targetZones';
import { PoseLandmarkIndex } from './types';
import { HandLandmarkIndex } from './handLandmarker';
import { classifyPointInTargets, sideFromTargets } from './targetZones';
import {
  isVisible,
  computeBodyCenterX,
  landmarkToContainerNorm,
} from './landmarkUtils';
import { sideFromDisplayX } from './gestureSelectorWide';

export { applyMirror, sideFromDisplayX } from './gestureSelectorWide';

/** Max wall-clock span for consecutive tracking misses during an active hold. */
export const HOLD_GRACE_MAX_MS = 100;
/** Max consecutive no-candidate inference frames during an active hold. */
export const HOLD_GRACE_MAX_CONSECUTIVE_MISSES = 2;

const GRACE_BLOCKING_REASONS = new Set([
  'neutral_zone',
  'ambiguous',
  'near_body',
  'wrong_side',
]);

interface SideCandidate {
  side: 'left' | 'right';
  confidence: number;
  source: 'pose' | 'hand';
}

type LayoutInput = Pick<
  GestureSelectorInput,
  'videoWidth' | 'videoHeight' | 'displayWidth' | 'displayHeight' | 'mirrored'
>;

function bodyCenterContainerX(
  bodyCenterXNorm: number,
  layout: LayoutInput,
): number {
  return landmarkToContainerNorm({ x: bodyCenterXNorm, y: 0.5 }, layout).x;
}

function isExtendedFromBody(
  pointX: number,
  bodyCenterX: number,
  side: 'left' | 'right',
  minExtension: number,
): boolean {
  const delta = pointX - bodyCenterX;
  if (side === 'left') return delta <= -minExtension;
  if (side === 'right') return delta >= minExtension;
  return false;
}

const FINGER_TIP_INDICES = [
  HandLandmarkIndex.INDEX_FINGER_TIP,
  HandLandmarkIndex.MIDDLE_FINGER_TIP,
  HandLandmarkIndex.RING_FINGER_TIP,
] as const;

function averageLandmarks(landmarks: Landmark[]): Landmark {
  return {
    x: landmarks.reduce((sum, t) => sum + t.x, 0) / landmarks.length,
    y: landmarks.reduce((sum, t) => sum + t.y, 0) / landmarks.length,
    z: landmarks.reduce((sum, t) => sum + (t.z ?? 0), 0) / landmarks.length,
    visibility: Math.min(...landmarks.map((t) => t.visibility ?? 1)),
  };
}

/** Aim from outward-reaching fingertips (not palm / idle finger defaults). */
export function getHandAimLandmark(
  handLandmarks: Landmark[],
  bodyCenterXNorm: number,
): Landmark | null {
  const wrist = handLandmarks[HandLandmarkIndex.WRIST];
  const tips = FINGER_TIP_INDICES
    .map((i) => handLandmarks[i])
    .filter((lm): lm is Landmark => Boolean(lm));
  if (tips.length === 0) return wrist ?? null;
  if (!wrist) return averageLandmarks(tips);

  const wristBodyDist = Math.abs(wrist.x - bodyCenterXNorm);
  let best: Landmark | null = null;
  let bestReach = 0;

  for (const tip of tips) {
    if (Math.abs(tip.x - bodyCenterXNorm) < wristBodyDist + 0.01) continue;
    const reach = Math.abs(tip.x - wrist.x);
    if (reach > bestReach) {
      best = tip;
      bestReach = reach;
    }
  }

  if (best) return best;
  return averageLandmarks(tips);
}

function isHandPointingOutward(
  handLandmarks: Landmark[],
  layout: LayoutInput,
  bodyCenterXNorm: number,
  side: 'left' | 'right',
  minExtension: number,
): boolean {
  const wrist = handLandmarks[HandLandmarkIndex.WRIST];
  if (!wrist) return true;

  const wristN = landmarkToContainerNorm(wrist, layout);
  const bodyX = bodyCenterContainerX(bodyCenterXNorm, layout);

  return FINGER_TIP_INDICES.some((index) => {
    const tip = handLandmarks[index];
    if (!tip) return false;
    const tipN = landmarkToContainerNorm(tip, layout);
    if (!isExtendedFromBody(tipN.x, bodyX, side, minExtension)) return false;
    if (side === 'left') return tipN.x <= wristN.x - 0.01;
    return tipN.x >= wristN.x + 0.01;
  });
}

function evaluatePointForTargets(
  displayXNorm: number,
  displayYNorm: number,
  bodyCenterXNorm: number,
  layout: LayoutInput,
  settings: GestureSelectorInput['settings'],
  targetZones: TargetZoneSet | undefined,
  source: 'pose' | 'hand',
  confidence: number,
  handLandmarks?: Landmark[],
): SideCandidate | null {
  if (!targetZones) {
    const side = sideFromDisplayX(displayXNorm, settings);
    if (!side) return null;
    const bodyX = bodyCenterContainerX(bodyCenterXNorm, layout);
    if (!isExtendedFromBody(displayXNorm, bodyX, side, settings.minArmExtensionPercent)) {
      return null;
    }
    return { side, confidence, source };
  }

  const zoneHit = classifyPointInTargets(displayXNorm, displayYNorm, targetZones);
  if (zoneHit === 'neutral' || zoneHit === 'none' || zoneHit === 'ambiguous') {
    return null;
  }

  const bodyX = bodyCenterContainerX(bodyCenterXNorm, layout);
  if (!isExtendedFromBody(displayXNorm, bodyX, zoneHit, settings.minArmExtensionPercent)) {
    return null;
  }

  if (source === 'hand' && handLandmarks) {
    if (!isHandPointingOutward(handLandmarks, layout, bodyCenterXNorm, zoneHit, settings.minArmExtensionPercent)) {
      return null;
    }
  }

  const side = sideFromTargets(displayXNorm, displayYNorm, targetZones);
  if (!side) return null;

  return { side, confidence, source };
}

function evaluateWrist(
  wristLandmark: Landmark | undefined,
  bodyCenterXNorm: number,
  layout: LayoutInput,
  settings: GestureSelectorInput['settings'],
  visMin: number,
  targetZones?: TargetZoneSet,
): SideCandidate | null {
  if (!wristLandmark || !isVisible(wristLandmark, visMin)) return null;

  const { x: displayXNorm, y: displayYNorm } = landmarkToContainerNorm(wristLandmark, layout);

  return evaluatePointForTargets(
    displayXNorm,
    displayYNorm,
    bodyCenterXNorm,
    layout,
    settings,
    targetZones,
    'pose',
    wristLandmark.visibility ?? 0.8,
  );
}

export function evaluateHandSide(
  handLandmarks: Landmark[],
  layout: LayoutInput,
  settings: GestureSelectorInput['settings'],
  bodyCenterXNorm: number,
  targetZones?: TargetZoneSet,
): SideCandidate | null {
  const point = getHandAimLandmark(handLandmarks, bodyCenterXNorm);
  if (!point) return null;

  const { x: displayXNorm, y: displayYNorm } = landmarkToContainerNorm(point, layout);

  return evaluatePointForTargets(
    displayXNorm,
    displayYNorm,
    bodyCenterXNorm,
    layout,
    settings,
    targetZones,
    'hand',
    0.75,
    handLandmarks,
  );
}

function evaluatePosePreserveForSide(
  side: 'left' | 'right',
  poseLandmarks: Landmark[],
  bodyCenterXNorm: number,
  layout: LayoutInput,
  settings: GestureSelectorInput['settings'],
  visMin: number,
  targetZones?: TargetZoneSet,
): SideCandidate | null {
  if (!isPoseConfident(poseLandmarks, visMin)) return null;

  const wristIndex =
    side === 'left' ? PoseLandmarkIndex.LEFT_WRIST : PoseLandmarkIndex.RIGHT_WRIST;
  const candidate = evaluateWrist(
    poseLandmarks[wristIndex],
    bodyCenterXNorm,
    layout,
    settings,
    visMin,
    targetZones,
  );
  if (!candidate || candidate.side !== side) return null;
  return candidate;
}

export function isPoseConfident(
  poseLandmarks: Landmark[],
  visMin: number,
): boolean {
  const ls = poseLandmarks[PoseLandmarkIndex.LEFT_SHOULDER];
  const rs = poseLandmarks[PoseLandmarkIndex.RIGHT_SHOULDER];
  const lw = poseLandmarks[PoseLandmarkIndex.LEFT_WRIST];
  const rw = poseLandmarks[PoseLandmarkIndex.RIGHT_WRIST];

  const shoulderOk = isVisible(ls, visMin) && isVisible(rs, visMin);
  const wristOk =
    isVisible(lw, visMin * 0.8) || isVisible(rw, visMin * 0.8);

  return shoulderOk && wristOk;
}

export function isTooCloseToCamera(poseLandmarks: Landmark[] | undefined): boolean {
  if (!poseLandmarks || poseLandmarks.length < 17) return false;
  const nose = poseLandmarks[PoseLandmarkIndex.NOSE];
  const ls = poseLandmarks[PoseLandmarkIndex.LEFT_SHOULDER];
  const rs = poseLandmarks[PoseLandmarkIndex.RIGHT_SHOULDER];
  if (!nose || !ls || !rs) return false;
  const shoulderSpan = Math.abs(ls.x - rs.x);
  return shoulderSpan > 0.45;
}

function pickBestCandidate(
  candidates: SideCandidate[],
  state: GestureSelectorState,
): SideCandidate | null {
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];

  if (state.candidateSide) {
    const sticky = candidates.find((c) => c.side === state.candidateSide);
    if (sticky) return sticky;
  }

  return candidates.reduce((a, b) => (a.confidence >= b.confidence ? a : b));
}

function clearedHoldState(state: GestureSelectorState): GestureSelectorState {
  return {
    ...state,
    candidateSide: undefined,
    candidateStartMs: undefined,
    lockedSide: undefined,
    validHoldMs: undefined,
    lastHoldTickMs: undefined,
    holdInitiatedByHand: undefined,
    graceMissCount: undefined,
    graceMissStartMs: undefined,
  };
}

function applyHoldAndLock(
  best: SideCandidate,
  state: GestureSelectorState,
  timestampMs: number,
  settings: GestureSelectorInput['settings'],
  bodyCenterXNorm: number,
  zoneHit?: string,
): { output: GestureSelectorOutput; nextState: GestureSelectorState } {
  let nextState: GestureSelectorState = {
    ...state,
    graceMissCount: undefined,
    graceMissStartMs: undefined,
  };

  if (best.source === 'hand') {
    nextState.holdInitiatedByHand = true;
  }

  if (best.side !== state.candidateSide) {
    nextState = {
      ...nextState,
      candidateSide: best.side,
      candidateStartMs: timestampMs,
      lockedSide: undefined,
      validHoldMs: 0,
      lastHoldTickMs: undefined,
      holdInitiatedByHand: best.source === 'hand',
    };
  }

  let validHoldMs = nextState.validHoldMs ?? 0;
  if (nextState.lastHoldTickMs !== undefined) {
    validHoldMs += timestampMs - nextState.lastHoldTickMs;
  }
  nextState.lastHoldTickMs = timestampMs;
  nextState.validHoldMs = validHoldMs;

  const holdProgress = Math.min(1, validHoldMs / settings.minHoldMs);

  if (holdProgress >= 1) {
    if (!nextState.holdInitiatedByHand) {
      return {
        output: {
          candidateSide: best.side,
          confidence: best.confidence,
          holdProgress: Math.min(0.99, holdProgress),
          reason: 'holding',
          debug: { bodyCenterXNorm, source: best.source, zoneHit, validHoldMs },
        },
        nextState,
      };
    }

    const eventId = (state.lastLockEventId ?? 0) + 1;
    nextState = {
      ...nextState,
      lockedSide: best.side,
      cooldownUntilMs: timestampMs + settings.cooldownMs,
      candidateSide: undefined,
      candidateStartMs: undefined,
      validHoldMs: undefined,
      lastHoldTickMs: undefined,
      holdInitiatedByHand: undefined,
      pendingLock: { side: best.side, eventId, source: best.source },
      lastLockEventId: eventId,
    };
    return {
      output: {
        candidateSide: best.side,
        lockedSide: best.side,
        lockEventId: eventId,
        confidence: best.confidence,
        holdProgress: 1,
        reason: 'locked',
        debug: { bodyCenterXNorm, source: best.source, zoneHit },
      },
      nextState,
    };
  }

  return {
    output: {
      candidateSide: best.side,
      confidence: best.confidence,
      holdProgress,
      reason: 'holding',
      debug: { bodyCenterXNorm, source: best.source, zoneHit, validHoldMs },
    },
    nextState,
  };
}

export function outputFromPendingLock(state: GestureSelectorState): GestureSelectorOutput {
  const lock = state.pendingLock!;
  return {
    candidateSide: lock.side,
    lockedSide: lock.side,
    lockEventId: lock.eventId,
    confidence: 1,
    holdProgress: 1,
    reason: 'locked',
    debug: { source: lock.source },
  };
}

function inferNoCandidateReason(
  displayXNorm: number,
  displayYNorm: number,
  bodyCenterXNorm: number,
  layout: LayoutInput,
  settings: GestureSelectorInput['settings'],
  targetZones: TargetZoneSet | undefined,
): string {
  if (!targetZones) return 'no_candidate';

  const zoneHit = classifyPointInTargets(displayXNorm, displayYNorm, targetZones);
  if (zoneHit === 'neutral') return 'neutral_zone';
  if (zoneHit === 'ambiguous') return 'ambiguous';

  const bodyX = bodyCenterContainerX(bodyCenterXNorm, layout);
  if (zoneHit === 'left' || zoneHit === 'right') {
    if (!isExtendedFromBody(displayXNorm, bodyX, zoneHit, settings.minArmExtensionPercent)) {
      return 'near_body';
    }
  }

  return 'no_candidate';
}

function tryHoldGrace(
  state: GestureSelectorState,
  timestampMs: number,
  settings: GestureSelectorInput['settings'],
  reason: string,
): { output: GestureSelectorOutput; nextState: GestureSelectorState } | null {
  if (
    state.candidateSide === undefined ||
    state.lastHoldTickMs === undefined ||
    GRACE_BLOCKING_REASONS.has(reason)
  ) {
    return null;
  }

  const graceMissCount = (state.graceMissCount ?? 0) + 1;
  const graceMissStartMs = state.graceMissStartMs ?? timestampMs;
  const graceElapsed = timestampMs - graceMissStartMs;

  if (
    graceMissCount > HOLD_GRACE_MAX_CONSECUTIVE_MISSES ||
    graceElapsed > HOLD_GRACE_MAX_MS
  ) {
    return null;
  }

  const holdProgress = Math.min(1, (state.validHoldMs ?? 0) / settings.minHoldMs);

  return {
    output: {
      candidateSide: state.candidateSide,
      confidence: 0,
      holdProgress,
      reason: 'grace',
      debug: { graceMissCount, graceElapsed },
    },
    nextState: {
      ...state,
      graceMissCount,
      graceMissStartMs,
    },
  };
}

export function runGestureSelector(
  input: GestureSelectorInput,
  state: GestureSelectorState,
): { output: GestureSelectorOutput; nextState: GestureSelectorState } {
  const {
    poseLandmarks,
    handLandmarks,
    timestampMs,
    mirrored,
    calibration,
    settings,
    targetZones,
    requiredSide,
    allowPoseHoldStart = false,
  } = input;

  if (state.pendingLock) {
    return {
      output: outputFromPendingLock(state),
      nextState: state,
    };
  }

  if (state.cooldownUntilMs && timestampMs < state.cooldownUntilMs) {
    return {
      output: {
        confidence: 0,
        holdProgress: 0,
        reason: 'cooldown',
      },
      nextState: state,
    };
  }

  const visMin = settings.poseVisibilityMin;
  const candidates: SideCandidate[] = [];
  const layout: LayoutInput = {
    videoWidth: input.videoWidth,
    videoHeight: input.videoHeight,
    displayWidth: input.displayWidth,
    displayHeight: input.displayHeight,
    mirrored,
  };

  let bodyCenterXNorm = calibration.bodyCenterX;
  if (poseLandmarks && poseLandmarks.length >= 17) {
    bodyCenterXNorm =
      calibration.bodyCenterX !== 0.5
        ? calibration.bodyCenterX
        : computeBodyCenterX(poseLandmarks, visMin);
  }

  if (handLandmarks && handLandmarks.length > 0) {
    for (const hand of handLandmarks) {
      const hc = evaluateHandSide(hand, layout, settings, bodyCenterXNorm, targetZones);
      if (hc) candidates.push(hc);
    }
  }

  if (
    candidates.length === 0 &&
    state.candidateSide &&
    state.holdInitiatedByHand &&
    poseLandmarks &&
    poseLandmarks.length >= 17
  ) {
    const preserved = evaluatePosePreserveForSide(
      state.candidateSide,
      poseLandmarks,
      bodyCenterXNorm,
      layout,
      settings,
      visMin,
      targetZones,
    );
    if (preserved) candidates.push(preserved);
  }

  if (
    candidates.length === 0 &&
    allowPoseHoldStart &&
    poseLandmarks &&
    poseLandmarks.length >= 17 &&
    isPoseConfident(poseLandmarks, visMin)
  ) {
    const leftWrist = poseLandmarks[PoseLandmarkIndex.LEFT_WRIST];
    const rightWrist = poseLandmarks[PoseLandmarkIndex.RIGHT_WRIST];
    const leftC = evaluateWrist(leftWrist, bodyCenterXNorm, layout, settings, visMin, targetZones);
    const rightC = evaluateWrist(rightWrist, bodyCenterXNorm, layout, settings, visMin, targetZones);
    if (leftC) candidates.push(leftC);
    if (rightC) candidates.push(rightC);
  }

  if (requiredSide && candidates.length > 0) {
    const allowed = candidates.filter((c) => c.side === requiredSide);
    if (allowed.length === 0) {
      return {
        output: {
          confidence: 0,
          holdProgress: 0,
          reason: 'wrong_side',
          debug: { pointingAt: pickBestCandidate(candidates, state)?.side },
        },
        nextState: clearedHoldState(state),
      };
    }
    candidates.length = 0;
    candidates.push(...allowed);
  }

  const best = pickBestCandidate(candidates, state);

  if (!best) {
    let reason =
      !poseLandmarks && (!handLandmarks || handLandmarks.length === 0)
        ? 'no_landmarks'
        : 'no_candidate';

    if (handLandmarks?.[0]) {
      const aim = getHandAimLandmark(handLandmarks[0], bodyCenterXNorm);
      if (aim) {
        const { x, y } = landmarkToContainerNorm(aim, layout);
        reason = inferNoCandidateReason(x, y, bodyCenterXNorm, layout, settings, targetZones);
      }
    } else if (poseLandmarks) {
      const rw = poseLandmarks[PoseLandmarkIndex.RIGHT_WRIST]
        ?? poseLandmarks[PoseLandmarkIndex.LEFT_WRIST];
      if (rw) {
        const { x, y } = landmarkToContainerNorm(rw, layout);
        reason = inferNoCandidateReason(x, y, bodyCenterXNorm, layout, settings, targetZones);
      }
    }

    const grace = tryHoldGrace(state, timestampMs, settings, reason);
    if (grace) return grace;

    return {
      output: { confidence: 0, holdProgress: 0, reason },
      nextState: clearedHoldState(state),
    };
  }

  return applyHoldAndLock(best, state, timestampMs, settings, bodyCenterXNorm, best.side);
}

export function resetGestureState(): GestureSelectorState {
  return {};
}
