import {
  FilesetResolver,
  PoseLandmarker,
  FaceLandmarker
} from "@mediapipe/tasks-vision";
import {
  MODEL_ASSET_PATH,
  FACE_MODEL_ASSET_PATH,
  MODEL_INIT_TIMEOUT_MS
} from "@/config";

/**
 * Same-origin WASM so ad blockers / Safari / offline Docker still load MediaPipe.
 * Must NOT end with "/" — FilesetResolver builds paths as `${base}/vision_wasm_*.js`
 * and a trailing slash produced `mediapipe-wasm//vision...` → WASM heap faults.
 */
function wasmRootUrl() {
  let base = import.meta.env.BASE_URL ?? "/";
  if (!base.startsWith("/")) base = `/${base}`;
  if (!base.endsWith("/")) base += "/";
  const u = new URL("mediapipe-wasm/", window.location.origin + base);
  return u.href.replace(/\/+$/, "");
}

function withTimeout(promise, ms, label) {
  let t;
  const timeout = new Promise((_, reject) => {
    t = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(t));
}

export async function createLandmarkers(log) {
  const wasmUrl = wasmRootUrl();
  log(`Loading WASM runtime from ${wasmUrl} ...`);
  const t0 = performance.now();
  const vision = await FilesetResolver.forVisionTasks(wasmUrl);
  log(`WASM runtime ready (${Math.round(performance.now() - t0)} ms).`);

  log(`Creating PoseLandmarker (model: ${MODEL_ASSET_PATH})...`);
  const t1 = performance.now();
  const poseLandmarker = await withTimeout(
    PoseLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: MODEL_ASSET_PATH, delegate: "CPU" },
      runningMode: "IMAGE",
      numPoses: 1
    }),
    MODEL_INIT_TIMEOUT_MS,
    "PoseLandmarker.createFromOptions"
  );
  log(`PoseLandmarker ready (${Math.round(performance.now() - t1)} ms).`);

  log(`Creating FaceLandmarker (model: ${FACE_MODEL_ASSET_PATH})...`);
  const t2 = performance.now();
  const faceLandmarker = await withTimeout(
    FaceLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: FACE_MODEL_ASSET_PATH, delegate: "CPU" },
      runningMode: "IMAGE",
      numFaces: 1,
      outputFaceBlendshapes: true
    }),
    MODEL_INIT_TIMEOUT_MS,
    "FaceLandmarker.createFromOptions"
  );
  log(`FaceLandmarker ready (${Math.round(performance.now() - t2)} ms).`);

  return { poseLandmarker, faceLandmarker };
}
