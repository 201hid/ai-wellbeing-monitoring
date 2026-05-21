function formatDuration(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function createEyeTrackingTimers() {
  let lookingMs = 0;
  let notLookingMs = 0;

  return {
    update(isLooking, deltaMs) {
      if (isLooking) {
        lookingMs += deltaMs;
      } else {
        notLookingMs += deltaMs;
      }
    },
    reset() {
      lookingMs = 0;
      notLookingMs = 0;
    },
    getTotals() {
      return { lookingMs, notLookingMs };
    },
    getUiText() {
      return {
        looking: `Looking at screen: ${formatDuration(lookingMs)}`,
        notLooking: `Not looking at screen: ${formatDuration(notLookingMs)}`
      };
    }
  };
}
