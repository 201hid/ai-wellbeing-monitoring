/**
 * @typedef {'normal' | 'ai'} PomodoroMode
 * @typedef {{ splits: number, workMinutes: number, breakMinutes: number, mode: PomodoroMode }} PomodoroPlan
 * @typedef {'work' | 'break' | 'idle' | 'complete'} PomodoroPhase
 */

/**
 * @param {number} ms
 */
export function formatPomodoroClock(ms) {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * @param {PomodoroPlan} plan
 */
export function describePlan(plan) {
  const core = `${plan.splits}× ${plan.workMinutes} min focus, ${plan.breakMinutes} min break`;
  return plan.mode === "ai" ? `${core} · AI monitoring` : `${core} · timer only`;
}

/**
 * @param {{
 *   onTick?: (snapshot: ReturnType<typeof getSnapshot>) => void;
 *   onPhaseChange?: (snapshot: ReturnType<typeof getSnapshot>) => void;
 *   onComplete?: (snapshot: ReturnType<typeof getSnapshot>) => void;
 * }} hooks
 */
export function createPomodoroTimer(hooks = {}) {
  /** @type {PomodoroPlan | null} */
  let plan = null;
  /** @type {PomodoroPhase} */
  let phase = "idle";
  let splitIndex = 0;
  let endsAt = 0;
  /** @type {ReturnType<typeof setInterval> | null} */
  let intervalId = null;

  function getSnapshot() {
    const remainingMs =
      phase === "idle" || phase === "complete"
        ? 0
        : Math.max(0, endsAt - Date.now());
    return {
      plan,
      phase,
      splitIndex,
      splitsTotal: plan?.splits ?? 0,
      remainingMs,
      clock: formatPomodoroClock(remainingMs)
    };
  }

  function emitTick() {
    hooks.onTick?.(getSnapshot());
  }

  function emitPhaseChange() {
    hooks.onPhaseChange?.(getSnapshot());
  }

  function stopInterval() {
    if (intervalId != null) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }

  function finish() {
    stopInterval();
    phase = "complete";
    emitPhaseChange();
    hooks.onComplete?.(getSnapshot());
  }

  function startBreak() {
    phase = "break";
    endsAt = Date.now() + plan.breakMinutes * 60 * 1000;
    emitPhaseChange();
    emitTick();
  }

  function startWork() {
    phase = "work";
    endsAt = Date.now() + plan.workMinutes * 60 * 1000;
    emitPhaseChange();
    emitTick();
  }

  function onIntervalTick() {
    const remaining = Math.max(0, endsAt - Date.now());
    emitTick();
    if (remaining <= 0) advancePhase();
  }

  function advancePhase() {
    if (!plan) return;

    if (phase === "work") {
      if (splitIndex >= plan.splits) {
        finish();
        return;
      }
      startBreak();
      return;
    }

    if (phase === "break") {
      splitIndex += 1;
      startWork();
    }
  }

  return {
    getSnapshot,

    /** @param {PomodoroPlan} nextPlan */
    start(nextPlan) {
      stop();
      plan = {
        splits: Math.max(1, Math.floor(nextPlan.splits)),
        workMinutes: Math.max(1, Math.floor(nextPlan.workMinutes)),
        breakMinutes: Math.max(1, Math.floor(nextPlan.breakMinutes))
      };
      splitIndex = 1;
      stopInterval();
      startWork();
      intervalId = setInterval(onIntervalTick, 250);
    },

    stop() {
      stopInterval();
      plan = null;
      phase = "idle";
      splitIndex = 0;
      endsAt = 0;
      emitPhaseChange();
    },

    /** Skip to next phase (or finish if on last work block). */
    skipPhase() {
      if (!plan || phase === "idle" || phase === "complete") return;
      advancePhase();
    }
  };
}
