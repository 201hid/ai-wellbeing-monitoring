export function createBaselineManager({
  countdownMs,
  captureMs,
  minSamples,
  onOverlay,
  log,
  onCalibrated,
  onCalibrationFailed
}) {
  const state = {
    phase: "idle",
    countdownEndMs: 0,
    captureEndMs: 0,
    samples: [],
    baseline: null
  };

  function start() {
    state.phase = "countdown";
    state.countdownEndMs = performance.now() + countdownMs;
    state.samples = [];
    onOverlay("Hold your best posture. Session starts in 3...", true);
    log("Session calibration countdown started.");
  }

  function update(nowMs, metrics) {
    if (!metrics) return;

    if (state.phase === "countdown") {
      const remainingMs = state.countdownEndMs - nowMs;
      if (remainingMs <= 0) {
        state.phase = "capturing";
        state.captureEndMs = nowMs + captureMs;
        state.samples = [];
        onOverlay("Calibrating posture… keep still.", true);
        log("Session calibration sampling started.");
      } else {
        onOverlay(
          `Hold still. Starting session in ${Math.max(
            1,
            Math.ceil(remainingMs / 1000)
          )}…`,
          true
        );
      }
      return;
    }

    if (state.phase === "capturing") {
      state.samples.push({ shoulderWidth: metrics.shoulderWidth });
      if (nowMs < state.captureEndMs) return;

      const count = state.samples.length;
      if (count < minSamples) {
        state.phase = "idle";
        onOverlay(
          "Not enough stable frames. Ensure face and shoulders are visible, then try Start session again.",
          true
        );
        log(`Session calibration failed: only ${count} valid samples.`, {
          level: "warn"
        });
        onCalibrationFailed?.();
        return;
      }

      const shoulderWidth =
        state.samples.reduce((sum, s) => sum + s.shoulderWidth, 0) / count;
      state.baseline = { shoulderWidth };
      state.phase = "done";
      onOverlay("Calibration complete.", false);
      log(
        `Posture reference saved from ${count} frames: shoulderWidth=${shoulderWidth.toFixed(
          3
        )}`
      );
      onCalibrated?.();
      return;
    }
  }

  return {
    start,
    update,
    getBaseline: () => state.baseline,
    hasBaseline: () => Boolean(state.baseline),
    getPhase: () => state.phase,
    clearBaseline: () => {
      state.baseline = null;
      state.phase = "idle";
    }
  };
}
