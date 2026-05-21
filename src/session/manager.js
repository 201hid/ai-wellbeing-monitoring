import { computeProductivityScore, computeWellbeingScore } from "@/session/scores.js";
import { createBaselineManager } from "@/posture/baseline.js";

export function createSessionManager({
  countdownMs,
  captureMs,
  minSamples,
  onOverlay,
  onPhaseChange,
  onResults,
  log
}) {
  const state = {
    phase: "idle",
    lookingMs: 0,
    notLookingMs: 0,
    eyeOpennessSum: 0,
    eyeOpennessSamples: 0,
    goodPostureMs: 0,
    badPostureMs: 0,
    lastResults: null
  };

  const baseline = createBaselineManager({
    countdownMs,
    captureMs,
    minSamples,
    onOverlay: (message, visible) => {
      if (state.phase === "calibrating") {
        onOverlay(message, visible);
      }
    },
    log,
    onCalibrated: () => {
      if (state.phase !== "calibrating") return;
      resetSessionMetrics();
      state.phase = "active";
      onOverlay(null, false);
      onPhaseChange?.("active");
      log("Session active — tracking productivity and wellbeing.");
    },
    onCalibrationFailed: () => {
      if (state.phase !== "calibrating") return;
      state.phase = "idle";
      onPhaseChange?.("idle");
    }
  });

  function resetSessionMetrics() {
    state.lookingMs = 0;
    state.notLookingMs = 0;
    state.eyeOpennessSum = 0;
    state.eyeOpennessSamples = 0;
    state.goodPostureMs = 0;
    state.badPostureMs = 0;
    state.lastResults = null;
  }

  function startSession() {
    if (state.phase === "calibrating" || state.phase === "active") return;
    state.phase = "calibrating";
    resetSessionMetrics();
    baseline.start();
    onPhaseChange?.("calibrating");
    log("Start session — calibrating posture reference.");
  }

  function finishSession() {
    if (state.phase !== "active") return;

    const totalTrackedMs = state.lookingMs + state.notLookingMs;
    const avgEyeOpenness =
      state.eyeOpennessSamples > 0
        ? state.eyeOpennessSum / state.eyeOpennessSamples
        : null;
    const postureTrackedMs = state.goodPostureMs + state.badPostureMs;

    const productivity = computeProductivityScore(state.lookingMs, totalTrackedMs);
    const wellbeing = computeWellbeingScore({
      avgEyeOpenness,
      goodPostureMs: state.goodPostureMs,
      postureTrackedMs
    });

    state.lastResults = {
      productivity,
      wellbeing,
      lookingMs: state.lookingMs,
      totalTrackedMs,
      avgEyeOpenness,
      goodPostureMs: state.goodPostureMs,
      postureTrackedMs
    };
    state.phase = "results";
    onPhaseChange?.("results");
    onResults?.(state.lastResults);
    log(
      `Session finished — productivity=${productivity} wellbeing=${wellbeing} (looking ${Math.round(state.lookingMs / 1000)}s / ${Math.round(totalTrackedMs / 1000)}s tracked).`
    );
  }

  function dismissResults() {
    if (state.phase !== "results") return;
    state.phase = "idle";
    baseline.clearBaseline();
    onPhaseChange?.("idle");
    onOverlay("Ready for your next session. Press Start session when you are set.", true);
    log("Session results dismissed.");
  }

  function recordFrame(deltaMs, { isLooking, eyeOpenness, postureGood, hasPostureReading }) {
    if (state.phase !== "active" || deltaMs <= 0) return;

    if (isLooking) {
      state.lookingMs += deltaMs;
    } else {
      state.notLookingMs += deltaMs;
    }

    if (eyeOpenness != null) {
      state.eyeOpennessSum += eyeOpenness;
      state.eyeOpennessSamples += 1;
    }

    if (hasPostureReading && baseline.hasBaseline()) {
      if (postureGood) {
        state.goodPostureMs += deltaMs;
      } else {
        state.badPostureMs += deltaMs;
      }
    }
  }

  function updateCalibration(nowMs, metrics) {
    if (state.phase === "calibrating") {
      baseline.update(nowMs, metrics);
    }
  }

  return {
    startSession,
    finishSession,
    dismissResults,
    recordFrame,
    updateCalibration,
    getBaseline: () => baseline.getBaseline(),
    hasBaseline: () => baseline.hasBaseline(),
    isActive: () => state.phase === "active",
    isCalibrating: () => state.phase === "calibrating",
    getPhase: () => state.phase,
    getLastResults: () => state.lastResults
  };
}
