function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function midpoint(a, b) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function eyeCenterScore(landmarks, outerIdx, innerIdx, irisIdx) {
  const outer = landmarks?.[outerIdx];
  const inner = landmarks?.[innerIdx];
  const iris = landmarks?.[irisIdx];
  if (!outer || !inner || !iris) return null;

  const eyeWidth = distance(outer, inner);
  if (eyeWidth < 0.0001) return null;
  const center = midpoint(outer, inner);
  return distance(iris, center) / eyeWidth;
}

export function isLookingAtScreen(faceLandmarks) {
  const points = faceLandmarks?.[0];
  if (!points) return false;

  // MediaPipe Face Mesh indices (with iris):
  // Left eye outer 33, inner 133, iris center 468
  // Right eye outer 362, inner 263, iris center 473
  const leftScore = eyeCenterScore(points, 33, 133, 468);
  const rightScore = eyeCenterScore(points, 362, 263, 473);
  if (leftScore == null || rightScore == null) return false;

  // Lower means iris is closer to center of the eye line.
  const CENTER_SCORE_LIMIT = 0.18;
  return leftScore <= CENTER_SCORE_LIMIT && rightScore <= CENTER_SCORE_LIMIT;
}
