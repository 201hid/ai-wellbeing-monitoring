export const DEFAULT_VIDEO_CONSTRAINTS = {
  video: { width: 1280, height: 720 }
};

/**
 * Attach an existing MediaStream (create it synchronously inside a click handler,
 * then await this — Safari/Firefox require a user gesture for camera access).
 */
function waitForVideoDimensions(webcamEl, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const finish = () => {
      webcamEl.removeEventListener("loadedmetadata", onTry);
      webcamEl.removeEventListener("resize", onTry);
      webcamEl.removeEventListener("error", onErr);
      clearTimeout(timer);
    };
    const onTry = () => {
      if (webcamEl.videoWidth > 0 && webcamEl.videoHeight > 0) {
        finish();
        resolve();
      }
    };
    const onErr = () => {
      finish();
      reject(new Error("Video element error while waiting for frame size."));
    };
    if (webcamEl.videoWidth > 0 && webcamEl.videoHeight > 0) {
      resolve();
      return;
    }
    webcamEl.addEventListener("loadedmetadata", onTry);
    webcamEl.addEventListener("resize", onTry);
    webcamEl.addEventListener("error", onErr);
    const timer = setTimeout(() => {
      finish();
      reject(new Error(`Timed out waiting for camera frame size (${timeoutMs} ms).`));
    }, timeoutMs);
  });
}

export async function setupCameraFromStream(webcamEl, stream, log = () => {}) {
  log("Starting camera preview...");
  webcamEl.srcObject = stream;
  await webcamEl.play();
  await waitForVideoDimensions(webcamEl);
  log(
    `Video frame size: ${webcamEl.videoWidth}x${webcamEl.videoHeight} (required before MediaPipe detect).`
  );
  const track = stream.getVideoTracks()[0];
  if (track?.getSettings) {
    log(`Camera ready: ${JSON.stringify(track.getSettings())}`);
  } else {
    log("Camera ready.");
  }
}

/** Request camera and attach (fine for dev/tests; prefer setupCameraFromStream + gesture in UI). */
export async function setupCamera(webcamEl, log = () => {}) {
  log("Requesting camera access...");
  const stream = await navigator.mediaDevices.getUserMedia(DEFAULT_VIDEO_CONSTRAINTS);
  await setupCameraFromStream(webcamEl, stream, log);
}

/** User-visible strings when getUserMedia / startup fails (Chrome vs Cursor differ mostly by permission UX). */
export function describeCameraStartupFailure(err) {
  if (err instanceof DOMException) {
    if (err.name === "NotAllowedError") {
      return {
        status:
          "Camera permission denied. Click the lock icon in the address bar → Site settings → Camera → Allow, then reload.",
        detail: err.message
      };
    }
    if (err.name === "NotFoundError") {
      return {
        status: "No camera detected. Plug in a camera or allow access in System Settings.",
        detail: err.message
      };
    }
    if (err.name === "NotReadableError" || err.name === "AbortError") {
      return {
        status: "Camera is busy or unavailable. Quit other apps using the camera (Zoom, FaceTime, Cursor preview).",
        detail: err.message
      };
    }
  }
  const fallback =
    err instanceof Error ? err.message : typeof err === "string" ? err : "Unknown error";
  if (
    typeof fallback === "string" &&
    /memory access out of bounds/i.test(fallback)
  ) {
    return {
      status:
        "MediaPipe WASM fault (often fixed by waiting for real camera resolution — reload). If it persists, hard-refresh and confirm video preview shows before detection.",
      detail: fallback
    };
  }
  return {
    status:
      "Could not start camera or AI models. Open DevTools (F12) → Console & Network; confirm /mediapipe-wasm/ and *.task load with status 200.",
    detail: fallback
  };
}
