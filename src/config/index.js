export const MODEL_ASSET_PATH = "/pose_landmarker_lite.task";
export const FACE_MODEL_ASSET_PATH = "/face_landmarker.task";
export const MODEL_INIT_TIMEOUT_MS = 60_000;

export const CONNECTORS = [
  [11, 12],
  [11, 13],
  [13, 15],
  [12, 14],
  [14, 16],
  [11, 23],
  [12, 24],
  [23, 24],
  [23, 25],
  [25, 27],
  [24, 26],
  [26, 28]
];

export const SESSION_CALIBRATION_COUNTDOWN_MS = 3000;
export const SESSION_CALIBRATION_CAPTURE_MS = 4000;
export const SESSION_CALIBRATION_MIN_SAMPLES = 12;

export const SESSION_CALIBRATION_DISCLAIMER =
  "Please keep your posture straight and look at the camera with your eyes open.";

export const BLINK_CLOSE_THRESHOLD = 0.6;
export const BLINK_OPEN_THRESHOLD = 0.25;
