function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function eyeEAR(points, p1, p2, p3, p4, p5, p6) {
  const i1 = points[p1];
  const i2 = points[p2];
  const i3 = points[p3];
  const i4 = points[p4];
  const i5 = points[p5];
  const i6 = points[p6];
  if (!i1 || !i2 || !i3 || !i4 || !i5 || !i6) return null;

  const a = dist(i2, i6);
  const b = dist(i3, i5);
  const c = dist(i1, i4);
  if (!Number.isFinite(a + b + c) || c < 1e-6) return null;
  return (a + b) / (2 * c);
}

function average(values) {
  if (!values.length) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export function getEyeOpennessPercent(faceLandmarks) {
  const points = faceLandmarks?.[0];
  if (!points) return null;

  // Use multiple EAR variants and average valid ones for stability.
  const leftCandidates = [
    eyeEAR(points, 33, 160, 158, 133, 153, 144),
    eyeEAR(points, 33, 159, 158, 133, 153, 145)
  ].filter((v) => v != null);
  const rightCandidates = [
    eyeEAR(points, 362, 385, 387, 263, 373, 380),
    eyeEAR(points, 362, 386, 385, 263, 380, 374)
  ].filter((v) => v != null);

  const leftEAR = average(leftCandidates);
  const rightEAR = average(rightCandidates);
  if (leftEAR == null || rightEAR == null) return null;

  const ear = (leftEAR + rightEAR) / 2;
  const CLOSED_EAR = 0.12;
  const OPEN_EAR = 0.36;
  const normalized = (ear - CLOSED_EAR) / (OPEN_EAR - CLOSED_EAR);
  return Math.round(clamp(normalized, 0, 1) * 100);
}
