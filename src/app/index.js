import {
  SESSION_CALIBRATION_CAPTURE_MS,
  SESSION_CALIBRATION_COUNTDOWN_MS,
  SESSION_CALIBRATION_DISCLAIMER,
  SESSION_CALIBRATION_MIN_SAMPLES
} from "@/config";
import {
  DEFAULT_VIDEO_CONSTRAINTS,
  describeCameraStartupFailure,
  setupCameraFromStream
} from "@/core/camera.js";
import { createLandmarkers } from "@/detection/landmarkers.js";
import { createBlinkCounter } from "@/blink/counter.js";
import { getEyeOpennessPercent } from "@/eye-tracking/ear.js";
import { createEyeTrackingTimers } from "@/eye-tracking/timers.js";
import { isLookingAtScreen } from "@/eye-tracking/gaze.js";
import { createSessionManager } from "@/session/manager.js";
import { getShoulderMetrics, assessShoulderPosture } from "@/posture/shoulder.js";
import { drawSkeleton } from "@/render/skeleton.js";
import { bindRangeControl } from "@/ui/controls.js";
import { createLogger } from "@/ui/logger.js";
import { getDom } from "@/ui/dom.js";

export async function runApp() {
  const dom = getDom();
  const {
    startCameraGateEl,
    startCameraBtnEl,
    webcamEl,
    canvasEl,
    performanceModeEl,
    sessionOverlayEl,
    sessionOverlayPanelEl,
    sessionCalibrationDisclaimerEl,
    sessionOverlayTextEl,
    startSessionEl,
    finishSessionEl,
    finishSessionHeaderEl,
    sessionResultsPanelEl,
    productivityScoreEl,
    wellbeingScoreEl,
    startNewSessionEl,
    statusEl,
    postureEl,
    hudPostureEl,
    blinksEl,
    hudBlinksEl,
    eyeOpenPercentEl,
    hudEyeOpenEl,
    lookingTimeEl,
    hudLookingTimeEl,
    notLookingTimeEl,
    hudNotLookingTimeEl,
    shoulderWidthIncreaseThresholdEl,
    shoulderWidthIncreaseThresholdValueEl
  } = dom;

  const log = createLogger(null);

  globalThis.addEventListener("error", (ev) => {
    log(
      `window.error: ${ev.message} (${ev.filename ?? "?"}:${ev.lineno ?? "?"})`,
      { level: "error" }
    );
  });
  globalThis.addEventListener("unhandledrejection", (ev) => {
    const r = ev.reason;
    const detail = r instanceof Error ? `${r.name}: ${r.message}` : String(r);
    log(`unhandledrejection: ${detail}`, { level: "error" });
  });

  log(`Boot | href=${globalThis.location?.href ?? ""}`);
  log(
    `Context | isSecureContext=${globalThis.isSecureContext} mediaDevices=${Boolean(navigator.mediaDevices?.getUserMedia)}`
  );

  if (sessionCalibrationDisclaimerEl) {
    sessionCalibrationDisclaimerEl.textContent = SESSION_CALIBRATION_DISCLAIMER;
  }

  const ctx = canvasEl.getContext("2d");

  const thresholds = { shoulderWidthIncreaseLimit: 0.15 };
  const perfMode = {
    enabled: false,
    detectIntervalMs: 0
  };

  function applyPerformanceMode(enabled) {
    perfMode.enabled = enabled;
    perfMode.detectIntervalMs = enabled ? 100 : 0; // 10 FPS inference
  }

  applyPerformanceMode(false);
  if (performanceModeEl) {
    performanceModeEl.checked = false;
    performanceModeEl.addEventListener("change", (e) => {
      applyPerformanceMode(Boolean(e.target?.checked));
    });
  }

  function setSessionOverlay(message, visible = true) {
    if (!sessionOverlayEl) return;
    if (sessionOverlayTextEl && message) {
      sessionOverlayTextEl.textContent = message;
    }
    sessionOverlayEl.style.display = visible ? "flex" : "none";
  }

  function showSessionResults({ productivity, wellbeing }) {
    if (productivityScoreEl) productivityScoreEl.textContent = String(productivity);
    if (wellbeingScoreEl) wellbeingScoreEl.textContent = String(wellbeing);
    if (sessionOverlayPanelEl) sessionOverlayPanelEl.classList.add("hidden");
    if (sessionResultsPanelEl) sessionResultsPanelEl.classList.remove("hidden");
    if (sessionOverlayEl) {
      sessionOverlayEl.style.display = "flex";
      sessionOverlayEl.classList.add("session-overlay--ended");
    }
    if (statusEl) {
      statusEl.textContent = `Session ended — Productivity ${productivity}, Wellbeing ${wellbeing}`;
    }
  }

  function hideSessionResults() {
    if (sessionResultsPanelEl) sessionResultsPanelEl.classList.add("hidden");
    if (sessionOverlayPanelEl) sessionOverlayPanelEl.classList.remove("hidden");
    sessionOverlayEl?.classList.remove("session-overlay--ended");
  }

  function syncSessionChrome(phase) {
    const active = phase === "active";
    const calibrating = phase === "calibrating";
    const showFinish = active;
    const showStart = phase === "idle" && !calibrating;

    finishSessionEl?.classList.toggle("hidden", !showFinish);
    finishSessionHeaderEl?.classList.toggle("hidden", !showFinish);
    startSessionEl?.classList.toggle("hidden", !showStart);
    sessionCalibrationDisclaimerEl?.classList.toggle("hidden", !calibrating);

    if (phase === "results") {
      finishSessionEl?.classList.add("hidden");
      finishSessionHeaderEl?.classList.add("hidden");
      startSessionEl?.classList.add("hidden");
    }
  }

  const session = createSessionManager({
    countdownMs: SESSION_CALIBRATION_COUNTDOWN_MS,
    captureMs: SESSION_CALIBRATION_CAPTURE_MS,
    minSamples: SESSION_CALIBRATION_MIN_SAMPLES,
    onOverlay: setSessionOverlay,
    onPhaseChange: (phase) => {
      syncSessionChrome(phase);
      if (phase === "active") {
        eyeTrackingTimers.reset();
      }
    },
    onResults: (results) => {
      showSessionResults(results);
      syncSessionChrome("results");
    },
    log
  });
  const blinkCounter = createBlinkCounter();
  const eyeTrackingTimers = createEyeTrackingTimers();

  bindRangeControl(shoulderWidthIncreaseThresholdEl, shoulderWidthIncreaseThresholdValueEl, {
    suffix: "%",
    transform: (v) => v / 100,
    format: (v) => (v * 100).toFixed(0),
    onChange: (v) => {
      thresholds.shoulderWidthIncreaseLimit = v;
    }
  });

  const finishSession = () => session.finishSession();
  const startSession = () => session.startSession();

  startSessionEl?.addEventListener("click", startSession);
  finishSessionEl?.addEventListener("click", finishSession);
  finishSessionHeaderEl?.addEventListener("click", finishSession);
  startNewSessionEl?.addEventListener("click", () => {
    hideSessionResults();
    session.dismissResults();
    syncSessionChrome("idle");
  });

  setSessionOverlay(
    "Start the camera, then press Start session to track focus and wellbeing.",
    true
  );
  syncSessionChrome("idle");

  if (!globalThis.isSecureContext) {
    log(
      "Blocked: not a secure context — camera/WebCrypto expectations fail on plain HTTP except localhost/127.0.0.1.",
      { level: "error" }
    );
    statusEl.textContent =
      "Camera is blocked: this page is not a secure context. Use https:// or open via http://localhost or http://127.0.0.1 — not http://192.168.x.x.";
    postureEl.textContent = `Current origin: ${globalThis.location?.origin ?? "?"}`;
    if (startCameraGateEl) {
      const gateText = startCameraGateEl.querySelector("p");
      if (gateText) {
        gateText.textContent =
          "Embedded previews (e.g. Cursor) may use a URL that allows the camera. Normal Chrome only allows camera on HTTPS, or on http://localhost / http://127.0.0.1. For a LAN IP or custom hostname, use HTTPS.";
      }
    }
    if (startCameraBtnEl) startCameraBtnEl.disabled = true;
    return;
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    log("Blocked: navigator.mediaDevices.getUserMedia missing.", { level: "error" });
    statusEl.textContent =
      "Camera API unavailable (non-secure page or unsupported browser). Use HTTPS or localhost.";
    return;
  }

  statusEl.textContent =
    "Click Start camera on the preview — Chrome will prompt for permission (check the address bar if you do not see it).";

  if (!startCameraBtnEl) {
    log("DOM error: #start-camera missing.", { level: "error" });
    statusEl.textContent = "Page error: missing Start camera button.";
    return;
  }

  log("Waiting for user to click Start camera…");

  startCameraBtnEl.addEventListener("click", () => {
    if (startCameraBtnEl.disabled) return;
    startCameraBtnEl.disabled = true;
    statusEl.textContent = "Opening camera and loading AI models…";
    log("Start camera clicked → getUserMedia(...)");

    const streamPromise = navigator.mediaDevices.getUserMedia(DEFAULT_VIDEO_CONSTRAINTS);

    void (async () => {
      try {
        const stream = await streamPromise;
        log("getUserMedia resolved; attaching stream to video.");
        await setupCameraFromStream(webcamEl, stream, log);
        log("Initializing MediaPipe landmarkers…");
        const { poseLandmarker, faceLandmarker } = await createLandmarkers(log);
        log("Landmarkers ready; starting render loop.");
        log("Detect path: VIDEO mode, CPU delegate, detectForVideo(webcam), shared WebGL binding canvas.");
        if (startCameraGateEl) startCameraGateEl.style.display = "none";
        startSessionEl?.removeAttribute("disabled");
        setSessionOverlay(
          "Press Start session when you are ready. We will calibrate your posture, then track focus and wellbeing.",
          true
        );

        statusEl.textContent = "Camera ready. Detecting posture and eye gaze...";
        postureEl.textContent = "Posture: starting detector loop...";
        if (hudPostureEl) hudPostureEl.textContent = postureEl.textContent;
        if (blinksEl) blinksEl.textContent = `Blinks: ${blinkCounter.getCount()}`;
        if (hudBlinksEl && blinksEl) hudBlinksEl.textContent = blinksEl.textContent;
        if (eyeOpenPercentEl) eyeOpenPercentEl.textContent = "Eye openness (EAR): --%";
        if (hudEyeOpenEl && eyeOpenPercentEl) hudEyeOpenEl.textContent = eyeOpenPercentEl.textContent;
        const initTimes = eyeTrackingTimers.getUiText();
        if (lookingTimeEl) lookingTimeEl.textContent = initTimes.looking;
        if (hudLookingTimeEl && lookingTimeEl) hudLookingTimeEl.textContent = lookingTimeEl.textContent;
        if (notLookingTimeEl) notLookingTimeEl.textContent = initTimes.notLooking;
        if (hudNotLookingTimeEl && notLookingTimeEl) hudNotLookingTimeEl.textContent = notLookingTimeEl.textContent;

        let lastVideoTime = -1;
        let lastDetectAtMs = 0;
        let lastSampleTime = globalThis.performance.now();
        let lastPersonSeen = false;
        let lastDetectErrorLog = 0;

        const render = () => {
          try {
            const width = webcamEl.videoWidth;
            const height = webcamEl.videoHeight;
            // Never run MediaPipe on placeholder sizes — 0×0 + fallback draw caused WASM OOB in Chrome/Safari.
            if (!width || !height) {
              requestAnimationFrame(render);
              return;
            }

            canvasEl.width = width;
            canvasEl.height = height;

            if (webcamEl.currentTime !== lastVideoTime) {
              const gateNow = globalThis.performance.now();
              if (
                perfMode.detectIntervalMs > 0 &&
                gateNow - lastDetectAtMs < perfMode.detectIntervalMs
              ) {
                requestAnimationFrame(render);
                return;
              }
              lastDetectAtMs = gateNow;

              const sampleNow = globalThis.performance.now();
              const deltaMs = Math.max(0, sampleNow - lastSampleTime);
              lastSampleTime = sampleNow;
              lastVideoTime = webcamEl.currentTime;
              let poseResult;
              let faceResult = null;
              let openness = null;
              const detectAtMs = globalThis.performance.now();

              try {
                try {
                  poseResult = poseLandmarker.detectForVideo(webcamEl, detectAtMs);
                } catch (poseErr) {
                  const now = globalThis.performance.now();
                  if (now - lastDetectErrorLog > 2000) {
                    lastDetectErrorLog = now;
                    const msg =
                      poseErr instanceof Error
                        ? `${poseErr.name}: ${poseErr.message}\n${poseErr.stack || ""}`
                        : String(poseErr);
                    log(`pose detectForVideo failed: ${msg}`, { level: "error" });
                  }
                  poseResult = null;
                }

                try {
                  faceResult = faceLandmarker.detectForVideo(webcamEl, detectAtMs);
                } catch (faceErr) {
                  const now = globalThis.performance.now();
                  if (now - lastDetectErrorLog > 2000) {
                    lastDetectErrorLog = now;
                    const msg =
                      faceErr instanceof Error
                        ? `${faceErr.name}: ${faceErr.message}\n${faceErr.stack || ""}`
                        : String(faceErr);
                    log(`face detectForVideo failed: ${msg}`, { level: "error" });
                  }
                  faceResult = null;
                }

                const blinkCount = blinkCounter.update(faceResult);
                if (blinksEl) blinksEl.textContent = `Blinks: ${blinkCount}`;
                if (hudBlinksEl && blinksEl) hudBlinksEl.textContent = blinksEl.textContent;
                openness = getEyeOpennessPercent(faceResult?.faceLandmarks);
                if (eyeOpenPercentEl) {
                  eyeOpenPercentEl.textContent =
                    openness == null
                      ? "Eye openness (EAR): --%"
                      : `Eye openness (EAR): ${openness}%`;
                }
                if (hudEyeOpenEl && eyeOpenPercentEl) hudEyeOpenEl.textContent = eyeOpenPercentEl.textContent;
              } catch (e) {
                const now = globalThis.performance.now();
                if (now - lastDetectErrorLog > 2000) {
                  lastDetectErrorLog = now;
                  const msg =
                    e instanceof Error ? `${e.name}: ${e.message}\n${e.stack || ""}` : String(e);
                  log(`detectForVideo failed: ${msg}`, { level: "error" });
                }
                poseResult = null;
                faceResult = null;
                if (eyeOpenPercentEl) eyeOpenPercentEl.textContent = "Eye openness (EAR): --%";
                if (hudEyeOpenEl && eyeOpenPercentEl) hudEyeOpenEl.textContent = eyeOpenPercentEl.textContent;
              }

              const isLooking = isLookingAtScreen(faceResult?.faceLandmarks);
              if (session.isActive()) {
                eyeTrackingTimers.update(isLooking, deltaMs);
              }
              const times = eyeTrackingTimers.getUiText();
              if (lookingTimeEl) lookingTimeEl.textContent = times.looking;
              if (hudLookingTimeEl && lookingTimeEl) hudLookingTimeEl.textContent = lookingTimeEl.textContent;
              if (notLookingTimeEl) notLookingTimeEl.textContent = times.notLooking;
              if (hudNotLookingTimeEl && notLookingTimeEl) hudNotLookingTimeEl.textContent = notLookingTimeEl.textContent;

              const landmarks = poseResult?.landmarks?.[0];
              if (landmarks) {
                if (!lastPersonSeen) {
                  lastPersonSeen = true;
                  log("Pose detected (first landmarks received).");
                }
                drawSkeleton(ctx, landmarks, width, height);

                const metrics = getShoulderMetrics(landmarks);
                if (!metrics) {
                  postureEl.textContent = "Posture: not enough points";
                  postureEl.style.borderColor = "#f59e0b";
                  postureEl.style.color = "#f59e0b";
                  if (hudPostureEl) hudPostureEl.textContent = postureEl.textContent;
                  statusEl.textContent = "Need both shoulders visible for posture tracking.";
                  if (session.isActive()) {
                    session.recordFrame(deltaMs, {
                      isLooking,
                      eyeOpenness: openness,
                      postureGood: false,
                      hasPostureReading: false
                    });
                  } else if (session.isCalibrating()) {
                    setSessionOverlay(
                      "Need both shoulders visible to start the session.",
                      true
                    );
                  }
                } else {
                  const nowMs = globalThis.performance.now();
                  session.updateCalibration(nowMs, metrics);
                  const posture = assessShoulderPosture(
                    metrics,
                    session.getBaseline(),
                    thresholds.shoulderWidthIncreaseLimit
                  );
                  const postureGood = posture.label === "Posture: good";
                  if (session.isActive()) {
                    session.recordFrame(deltaMs, {
                      isLooking,
                      eyeOpenness: openness,
                      postureGood,
                      hasPostureReading: session.hasBaseline()
                    });
                  }
                  postureEl.textContent = posture.label;
                  postureEl.style.borderColor = posture.color;
                  postureEl.style.color = posture.color;
                  if (hudPostureEl) hudPostureEl.textContent = postureEl.textContent;
                  if (session.isActive()) {
                    statusEl.textContent = `Session active | ${posture.details}`;
                  } else if (session.isCalibrating()) {
                    statusEl.textContent = "Calibrating posture for session…";
                  } else if (session.hasBaseline()) {
                    statusEl.textContent = `Reference saved | ${posture.details}`;
                  } else {
                    statusEl.textContent = "Press Start session to begin tracking.";
                  }
                }
              } else {
                if (lastPersonSeen) {
                  lastPersonSeen = false;
                  log("Pose lost (no landmarks this frame).");
                }
                ctx.clearRect(0, 0, width, height);
                postureEl.textContent = "Posture: no person found";
                postureEl.style.color = "#94a3b8";
                postureEl.style.borderColor = "#334155";
                if (hudPostureEl) hudPostureEl.textContent = postureEl.textContent;
                statusEl.textContent = session.isActive()
                  ? "Session active — move into frame for posture."
                  : "Camera ready. Detecting posture...";
                if (session.isActive()) {
                  session.recordFrame(deltaMs, {
                    isLooking,
                    eyeOpenness: openness,
                    postureGood: false,
                    hasPostureReading: false
                  });
                }
              }
            }
          } catch (e) {
            log(`render loop error: ${e instanceof Error ? e.message : String(e)}`, {
              level: "error"
            });
            console.error("render loop error", e);
          }

          requestAnimationFrame(render);
        };

        requestAnimationFrame(render);
      } catch (err) {
        startCameraBtnEl.disabled = false;
        const explained = describeCameraStartupFailure(err);
        statusEl.textContent = explained.status;
        postureEl.textContent = explained.detail.split("\n")[0] || "Error";
        const stack = err instanceof Error ? err.stack || err.message : String(err);
        log(`Startup failed: ${explained.status}`, { level: "error" });
        log(stack, { level: "error" });
        console.error("Startup failed", err);
      }
    })();
  });
}
