import {
  POMODORO_BREAK_MAX,
  POMODORO_BREAK_MIN,
  POMODORO_DEFAULT_BREAK_MINUTES,
  POMODORO_DEFAULT_SPLITS,
  POMODORO_DEFAULT_WORK_MINUTES,
  POMODORO_MODE_AI,
  POMODORO_MODE_NORMAL,
  POMODORO_SPLITS_MAX,
  POMODORO_SPLITS_MIN,
  POMODORO_WORK_MAX,
  POMODORO_WORK_MIN
} from "@/config/pomodoro.js";
import { createPomodoroTimer, describePlan, formatPomodoroClock } from "@/pomodoro/timer.js";

/**
 * @typedef {import('@/pomodoro/timer.js').PomodoroPlan} PomodoroPlan
 */

/**
 * @param {(ctx: {
 *   timer: ReturnType<typeof createPomodoroTimer>;
 *   plan: PomodoroPlan;
 *   endSession: () => void;
 *   startTimer: () => void;
 *   setAwaitingSetup: (message: string) => void;
 * }) => void | Promise<void>} onAiSessionReady
 */
export function initPomodoroSetup(onAiSessionReady) {
  const homeEl = document.getElementById("pomodoro-home");
  const workspaceEl = document.getElementById("workspace");
  const formEl = document.getElementById("pomodoro-setup-form");
  const splitsInput = document.getElementById("pomodoro-splits");
  const workInput = document.getElementById("pomodoro-work-min");
  const breakInput = document.getElementById("pomodoro-break-min");
  const phaseEl = document.getElementById("pomodoro-phase");
  const clockEl = document.getElementById("pomodoro-timer");
  const progressEl = document.getElementById("pomodoro-progress");
  const planSummaryEl = document.getElementById("pomodoro-plan-summary");
  const endBtn = document.getElementById("pomodoro-end-session");
  const skipBtn = document.getElementById("pomodoro-skip-phase");
  const aiSetupBannerEl = document.getElementById("pomodoro-ai-setup-banner");

  if (
    !homeEl ||
    !workspaceEl ||
    !formEl ||
    !splitsInput ||
    !workInput ||
    !breakInput
  ) {
    return;
  }

  const timer = createPomodoroTimer({
    onTick: updateTimerUi,
    onPhaseChange: updateTimerUi,
    onComplete: updateTimerUi
  });

  /** @type {PomodoroPlan | null} */
  let activePlan = null;
  let awaitingSetup = false;
  let setupMessage = "";

  function clampInt(value, min, max, fallback) {
    const n = Number.parseInt(String(value), 10);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, n));
  }

  function readModeFromForm() {
    const selected = formEl.querySelector('input[name="pomodoroMode"]:checked');
    const value = selected?.value;
    return value === POMODORO_MODE_AI ? POMODORO_MODE_AI : POMODORO_MODE_NORMAL;
  }

  function readPlanFromForm() {
    return {
      mode: readModeFromForm(),
      splits: clampInt(
        splitsInput.value,
        POMODORO_SPLITS_MIN,
        POMODORO_SPLITS_MAX,
        POMODORO_DEFAULT_SPLITS
      ),
      workMinutes: clampInt(
        workInput.value,
        POMODORO_WORK_MIN,
        POMODORO_WORK_MAX,
        POMODORO_DEFAULT_WORK_MINUTES
      ),
      breakMinutes: clampInt(
        breakInput.value,
        POMODORO_BREAK_MIN,
        POMODORO_BREAK_MAX,
        POMODORO_DEFAULT_BREAK_MINUTES
      )
    };
  }

  function applyWorkspaceMode(mode) {
    const mainApp = document.getElementById("main-app");
    workspaceEl.classList.remove("workspace-mode-normal", "workspace-mode-ai");
    workspaceEl.classList.add(
      mode === POMODORO_MODE_AI ? "workspace-mode-ai" : "workspace-mode-normal"
    );
    mainApp?.classList.toggle("pomodoro-session-normal", mode === POMODORO_MODE_NORMAL);
    mainApp?.classList.toggle("pomodoro-session-ai", mode === POMODORO_MODE_AI);
    if (aiSetupBannerEl) {
      aiSetupBannerEl.hidden = mode !== POMODORO_MODE_AI;
    }
  }

  function showHome() {
    const mainApp = document.getElementById("main-app");
    homeEl.classList.remove("hidden");
    workspaceEl.classList.add("hidden");
    workspaceEl.setAttribute("aria-hidden", "true");
    mainApp?.classList.remove("pomodoro-session-normal", "pomodoro-session-ai");
    activePlan = null;
    awaitingSetup = false;
    setupMessage = "";
    timer.stop();
    if (skipBtn) skipBtn.disabled = false;
    updateTimerUi(timer.getSnapshot());
  }

  function startTimer() {
    if (!activePlan) return;
    awaitingSetup = false;
    setupMessage = "";
    if (aiSetupBannerEl) aiSetupBannerEl.hidden = true;
    if (skipBtn) skipBtn.disabled = false;
    timer.start(activePlan);
    updateTimerUi(timer.getSnapshot());
  }

  function setAwaitingSetup(message) {
    if (!activePlan || activePlan.mode !== POMODORO_MODE_AI) return;
    awaitingSetup = true;
    setupMessage = message;
    if (skipBtn) skipBtn.disabled = true;
    if (aiSetupBannerEl) {
      aiSetupBannerEl.hidden = false;
      const text = aiSetupBannerEl.querySelector("p");
      if (text) text.textContent = message;
    }
    updateTimerUi(timer.getSnapshot());
  }

  function showWorkspace(plan) {
    activePlan = plan;
    homeEl.classList.add("hidden");
    workspaceEl.classList.remove("hidden");
    workspaceEl.removeAttribute("aria-hidden");
    applyWorkspaceMode(plan.mode);
    if (planSummaryEl) planSummaryEl.textContent = describePlan(plan);
    updateTimerUi(timer.getSnapshot());
  }

  function phaseLabel(phase) {
    if (awaitingSetup) return "Setup required";
    if (phase === "work") return "Focus";
    if (phase === "break") return "Break";
    if (phase === "complete") return "Session complete";
    return "Ready";
  }

  function updateTimerUi(snapshot) {
    const { phase, splitIndex, plan } = snapshot;
    const workMs =
      (plan?.workMinutes ?? activePlan?.workMinutes ?? POMODORO_DEFAULT_WORK_MINUTES) *
      60 *
      1000;

    if (phaseEl) {
      phaseEl.textContent = phaseLabel(phase);
      phaseEl.dataset.phase = awaitingSetup ? "setup" : phase;
    }
    if (clockEl) {
      clockEl.textContent =
        phase === "idle"
          ? formatPomodoroClock(workMs)
          : snapshot.clock;
    }
    if (progressEl) {
      if (awaitingSetup) {
        progressEl.textContent = setupMessage;
      } else if (phase === "idle" || !plan) {
        progressEl.textContent = "Configure a session on the home screen";
      } else if (phase === "complete") {
        progressEl.textContent = `Finished all ${plan.splits} focus rounds`;
      } else if (phase === "break") {
        progressEl.textContent = `Break before round ${splitIndex + 1} of ${plan.splits}`;
      } else {
        progressEl.textContent = `Focus round ${splitIndex} of ${plan.splits}`;
      }
    }
  }

  function createSessionApi(plan) {
    return {
      timer,
      plan,
      endSession: showHome,
      startTimer,
      setAwaitingSetup
    };
  }

  formEl.addEventListener("submit", (e) => {
    e.preventDefault();
    const plan = readPlanFromForm();
    splitsInput.value = String(plan.splits);
    workInput.value = String(plan.workMinutes);
    breakInput.value = String(plan.breakMinutes);
    showWorkspace(plan);

    if (plan.mode === POMODORO_MODE_NORMAL) {
      startTimer();
      return;
    }

    setAwaitingSetup(
      "Turn on your camera, then capture your posture baseline. The focus timer starts when baseline is saved."
    );

    const api = createSessionApi(plan);
    if (!workspaceEl.dataset.monitoringReady) {
      workspaceEl.dataset.monitoringReady = "1";
      void onAiSessionReady(api);
    } else {
      document.dispatchEvent(
        new CustomEvent("pomodoro-ai-session", { detail: api })
      );
    }
  });

  endBtn?.addEventListener("click", () => {
    showHome();
  });

  skipBtn?.addEventListener("click", () => {
    if (awaitingSetup) return;
    timer.skipPhase();
  });

  showHome();
  updateTimerUi(timer.getSnapshot());
}
