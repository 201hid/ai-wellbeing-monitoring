/** Productivity: share of tracked session time looking at the screen (0–100). */
export function computeProductivityScore(lookingMs, totalTrackedMs) {
  if (totalTrackedMs <= 0) return 0;
  const ratio = lookingMs / totalTrackedMs;
  return Math.round(Math.min(100, Math.max(0, ratio * 100)));
}

/**
 * Wellbeing: blend of average eye openness (0–100) and time in good posture vs leaning.
 */
export function computeWellbeingScore({ avgEyeOpenness, goodPostureMs, postureTrackedMs }) {
  const eyePart =
    avgEyeOpenness == null ? null : Math.min(100, Math.max(0, avgEyeOpenness));
  const posturePart =
    postureTrackedMs > 0
      ? Math.min(100, Math.max(0, (goodPostureMs / postureTrackedMs) * 100))
      : null;

  if (eyePart == null && posturePart == null) return 0;
  if (eyePart == null) return Math.round(posturePart);
  if (posturePart == null) return Math.round(eyePart);
  return Math.round((eyePart + posturePart) / 2);
}
