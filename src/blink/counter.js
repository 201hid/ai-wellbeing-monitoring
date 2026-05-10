import { BLINK_CLOSE_THRESHOLD, BLINK_OPEN_THRESHOLD } from "@/config";

function getBlendshapeScore(blendshapes, name) {
  if (!blendshapes?.categories) return 0;
  const item = blendshapes.categories.find((c) => c.categoryName === name);
  return item?.score ?? 0;
}

export function createBlinkCounter() {
  let blinkCount = 0;
  let eyesWereClosed = false;

  return {
    update(faceResult) {
      const blend = faceResult?.faceBlendshapes?.[0];
      const leftBlink = getBlendshapeScore(blend, "eyeBlinkLeft");
      const rightBlink = getBlendshapeScore(blend, "eyeBlinkRight");
      const blinkScore = (leftBlink + rightBlink) / 2;
      const eyesClosedNow = blinkScore >= BLINK_CLOSE_THRESHOLD;

      if (eyesClosedNow && !eyesWereClosed) {
        blinkCount += 1;
      } else if (!eyesClosedNow && blinkScore <= BLINK_OPEN_THRESHOLD) {
        eyesWereClosed = false;
        return blinkCount;
      }

      eyesWereClosed = eyesClosedNow;
      return blinkCount;
    },
    getCount() {
      return blinkCount;
    }
  };
}
