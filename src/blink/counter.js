import { BLINK_CLOSE_THRESHOLD, BLINK_OPEN_THRESHOLD } from "@/config";
import { getEyeOpennessPercent } from "@/eye-tracking/ear.js";

const EAR_BLINK_CLOSED_PERCENT = 30;
const EAR_BLINK_OPEN_PERCENT = 50;

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
      if (blend?.categories?.length) {
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
      }

      const openness = getEyeOpennessPercent(faceResult?.faceLandmarks);
      if (openness == null) return blinkCount;

      const eyesClosedNow = openness <= EAR_BLINK_CLOSED_PERCENT;
      if (eyesClosedNow && !eyesWereClosed) {
        blinkCount += 1;
      } else if (!eyesClosedNow && openness >= EAR_BLINK_OPEN_PERCENT) {
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
