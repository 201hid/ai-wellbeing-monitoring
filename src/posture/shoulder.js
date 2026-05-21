export function pointDistance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function getShoulderMetrics(landmarks) {
  const leftShoulder = landmarks?.[11];
  const rightShoulder = landmarks?.[12];
  if (!leftShoulder || !rightShoulder) return null;

  const shoulderWidth = pointDistance(leftShoulder, rightShoulder);
  if (shoulderWidth < 0.0001) return null;
  return { shoulderWidth };
}

export function assessShoulderPosture(metrics, baselineMetrics, shoulderWidthIncreaseLimit) {
  if (!baselineMetrics) {
    return {
      label: "Posture: session required",
      color: "#f59e0b",
      details: "start a session to calibrate posture"
    };
  }

  const increaseRatio =
    (metrics.shoulderWidth - baselineMetrics.shoulderWidth) /
    baselineMetrics.shoulderWidth;

  if (increaseRatio > shoulderWidthIncreaseLimit) {
    return {
      label: "Posture: leaning forward",
      color: "#ef4444",
      details: `shoulder width +${(increaseRatio * 100).toFixed(1)}% vs baseline`
    };
  }

  return {
    label: "Posture: good",
    color: "#22c55e",
    details: `shoulder width +${(increaseRatio * 100).toFixed(1)}% vs baseline`
  };
}
