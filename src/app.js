import {
  BASELINE_CAPTURE_MS,
  BASELINE_COUNTDOWN_MS,
  BASELINE_MIN_SAMPLES
} from "./config.js";
import { setupCamera } from "./core/camera.js";
import { createLandmarkers } from "./detection/landmarkers.js";
import { createBlinkCounter } from "./blink/counter.js";
import { getEyeOpennessPercent } from "./eyeTracking/ear.js";
import { createEyeTrackingTimers } from "./eyeTracking/timers.js";
import { isLookingAtScreen } from "./eyeTracking/gaze.js";
import { createBaselineManager } from "./posture/baseline.js";
import { getShoulderMetrics, assessShoulderPosture } from "./posture/shoulder.js";
import { drawSkeleton } from "./render/skeleton.js";
import { bindRangeControl } from "./ui/controls.js";
import { getDom } from "./ui/dom.js";

export async function runApp() {
  const dom = getDom();
  const {
    webcamEl,
    canvasEl,
    performanceModeEl,
    baselineOverlayEl,
    baselineOverlayTextEl,
    startBaselineCaptureEl,
    retakeBaselineEl,
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
    saveBaselineEl,
    shoulderWidthIncreaseThresholdEl,
    shoulderWidthIncreaseThresholdValueEl
  } = dom;

  const ctx = canvasEl.getContext("2d");
  const frameCanvas = document.createElement("canvas");
  const frameCtx = frameCanvas.getContext("2d", { willReadFrequently: true });
  const log = () => {};

  const thresholds = { shoulderWidthIncreaseLimit: 0.15 };
  const perfMode = {
    enabled: false,
    detectIntervalMs: 0,
    inputScale: 1
  };

  function applyPerformanceMode(enabled) {
    perfMode.enabled = enabled;
    perfMode.detectIntervalMs = enabled ? 100 : 0; // 10 FPS inference
    perfMode.inputScale = enabled ? 0.5 : 1; // half-size inference frame
  }

  applyPerformanceMode(false);
  if (performanceModeEl) {
    performanceModeEl.checked = false;
    performanceModeEl.addEventListener("change", (e) => {
      applyPerformanceMode(Boolean(e.target?.checked));
    });
  }

  function setBaselineOverlay(message, visible = true) {
    if (!baselineOverlayEl || !baselineOverlayTextEl) return;
    baselineOverlayTextEl.textContent = message;
    baselineOverlayEl.style.display = visible ? "flex" : "none";
  }

  const baseline = createBaselineManager({
    countdownMs: BASELINE_COUNTDOWN_MS,
    captureMs: BASELINE_CAPTURE_MS,
    minSamples: BASELINE_MIN_SAMPLES,
    onOverlay: setBaselineOverlay,
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

  const startBaseline = () => baseline.start();
  if (saveBaselineEl) saveBaselineEl.addEventListener("click", startBaseline);
  if (startBaselineCaptureEl) startBaselineCaptureEl.addEventListener("click", startBaseline);
  if (retakeBaselineEl) retakeBaselineEl.addEventListener("click", startBaseline);

  if (!navigator.mediaDevices?.getUserMedia) {
    statusEl.textContent = "Camera is not supported in this browser.";
    return;
  }

  try {
    await setupCamera(webcamEl, log);
    const { poseLandmarker, faceLandmarker } = await createLandmarkers(log);
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
        const width = webcamEl.videoWidth || 1280;
        const height = webcamEl.videoHeight || 720;
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

          try {
            if (!frameCtx) {
              throw new Error("2D frame context unavailable for CPU fallback.");
            }
            const detectWidth = Math.max(160, Math.round(width * perfMode.inputScale));
            const detectHeight = Math.max(90, Math.round(height * perfMode.inputScale));
            frameCanvas.width = detectWidth;
            frameCanvas.height = detectHeight;
            frameCtx.drawImage(webcamEl, 0, 0, detectWidth, detectHeight);
            poseResult = poseLandmarker.detect(frameCanvas);
            faceResult = faceLandmarker.detect(frameCanvas);
            const blinkCount = blinkCounter.update(faceResult);
            if (blinksEl) blinksEl.textContent = `Blinks: ${blinkCount}`;
            if (hudBlinksEl && blinksEl) hudBlinksEl.textContent = blinksEl.textContent;
            const openness = getEyeOpennessPercent(faceResult?.faceLandmarks);
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
              log(`pose/face detect failed: ${msg}`, { level: "error" });
            }
            poseResult = null;
            if (eyeOpenPercentEl) eyeOpenPercentEl.textContent = "Eye openness (EAR): --%";
            if (hudEyeOpenEl && eyeOpenPercentEl) hudEyeOpenEl.textContent = eyeOpenPercentEl.textContent;
          }

          const isLooking = isLookingAtScreen(faceResult?.faceLandmarks);
          eyeTrackingTimers.update(isLooking, deltaMs);
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
              statusEl.textContent = "Need both shoulders visible for shoulder-length check.";
              if (!baseline.hasBaseline()) {
                setBaselineOverlay("Need both shoulders visible before baseline capture.");
              }
            } else {
              baseline.update(globalThis.performance.now(), metrics);
              const posture = assessShoulderPosture(
                metrics,
                baseline.getBaseline(),
                thresholds.shoulderWidthIncreaseLimit
              );
              postureEl.textContent = posture.label;
              postureEl.style.borderColor = posture.color;
              postureEl.style.color = posture.color;
              if (hudPostureEl) hudPostureEl.textContent = postureEl.textContent;
              statusEl.textContent = baseline.hasBaseline()
                ? `Monitoring with baseline | ${posture.details}`
                : `Baseline required first | ${posture.details}`;
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
            statusEl.textContent = "Camera ready. Detecting posture...";
          }
        }
      } catch (e) {
        console.error("render loop error", e);
      }

      requestAnimationFrame(render);
    };

    requestAnimationFrame(render);
  } catch (err) {
    statusEl.textContent = "Unable to start camera. Check browser permission.";
    const stack = err instanceof Error ? err.stack || err.message : String(err);
    postureEl.textContent = stack.split("\n")[0] || "Error";
    console.error("Startup failed", stack);
  }
}
