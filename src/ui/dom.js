export function getDom() {
  return {
    startCameraGateEl: document.querySelector("#camera-start-gate"),
    startCameraBtnEl: document.querySelector("#start-camera"),
    webcamEl: document.querySelector("#webcam"),
    canvasEl: document.querySelector("#overlay"),
    performanceModeEl: document.querySelector("#performance-mode"),
    sessionOverlayEl: document.querySelector("#session-overlay"),
    sessionOverlayPanelEl: document.querySelector("#session-overlay-panel"),
    sessionOverlayTextEl: document.querySelector("#session-overlay-text"),
    startSessionEl: document.querySelector("#start-session"),
    finishSessionEl: document.querySelector("#finish-session"),
    finishSessionHeaderEl: document.querySelector("#finish-session-header"),
    sessionResultsPanelEl: document.querySelector("#session-results-panel"),
    productivityScoreEl: document.querySelector("#productivity-score"),
    wellbeingScoreEl: document.querySelector("#wellbeing-score"),
    startNewSessionEl: document.querySelector("#start-new-session"),
    statusEl: document.querySelector("#status"),
    postureEl: document.querySelector("#posture"),
    hudPostureEl: document.querySelector("#hud-posture"),
    blinksEl: document.querySelector("#blinks"),
    hudBlinksEl: document.querySelector("#hud-blinks"),
    eyeOpenPercentEl: document.querySelector("#eye-open-percent"),
    hudEyeOpenEl: document.querySelector("#hud-eye-open"),
    lookingTimeEl: document.querySelector("#looking-time"),
    hudLookingTimeEl: document.querySelector("#hud-looking"),
    notLookingTimeEl: document.querySelector("#not-looking-time"),
    hudNotLookingTimeEl: document.querySelector("#hud-not-looking"),
    shoulderWidthIncreaseThresholdEl: document.querySelector("#shoulder-width-increase-threshold"),
    shoulderWidthIncreaseThresholdValueEl: document.querySelector(
      "#shoulder-width-increase-threshold-value"
    ),
    logEl: document.querySelector("#debug-log"),
    copyLogEl: document.querySelector("#copy-debug-log"),
    clearLogEl: document.querySelector("#clear-debug-log")
  };
}
