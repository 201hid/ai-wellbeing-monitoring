export function createBaselineManager({
  countdownMs,
  captureMs,
  minSamples,
  onOverlay,
  log
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
    onOverlay("Hold your best posture. Capturing baseline in 3...", true);
    log("Baseline capture countdown started.");
  }

  function update(nowMs, metrics) {
    if (!metrics) return;

    if (state.phase === "countdown") {
      const remainingMs = state.countdownEndMs - nowMs;
      if (remainingMs <= 0) {
        state.phase = "capturing";
        state.captureEndMs = nowMs + captureMs;
        state.samples = [];
        onOverlay("Capturing baseline... keep still.", true);
        log("Baseline capture sampling started.");
      } else {
        onOverlay(
          `Hold still. Capturing baseline in ${Math.max(
            1,
            Math.ceil(remainingMs / 1000)
          )}...`,
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
          "Not enough stable frames. Ensure face + shoulders are visible, then try again.",
          true
        );
        log(`Baseline capture failed: only ${count} valid samples.`, {
          level: "warn"
        });
        return;
      }

      const shoulderWidth =
        state.samples.reduce((sum, s) => sum + s.shoulderWidth, 0) / count;
      state.baseline = { shoulderWidth };
      state.phase = "done";
      onOverlay("Baseline saved. Live posture monitoring is active.", false);
      log(
        `Baseline saved from ${count} frames: shoulderWidth=${shoulderWidth.toFixed(
          3
        )}`
      );
      return;
    }

    if (!state.baseline) {
      onOverlay("Set your best posture, then press Start baseline capture.", true);
    }
  }

  return {
    start,
    update,
    getBaseline: () => state.baseline,
    hasBaseline: () => Boolean(state.baseline)
  };
}
