import { CONNECTORS } from "../config.js";

export function drawSkeleton(ctx, landmarks, width, height) {
  ctx.save();
  ctx.clearRect(0, 0, width, height);
  ctx.translate(width, 0);
  ctx.scale(-1, 1);

  for (const [aIndex, bIndex] of CONNECTORS) {
    const a = landmarks[aIndex];
    const b = landmarks[bIndex];
    if (!a || !b) continue;
    ctx.beginPath();
    ctx.moveTo(a.x * width, a.y * height);
    ctx.lineTo(b.x * width, b.y * height);
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  for (const point of landmarks) {
    if (!point) continue;
    ctx.beginPath();
    ctx.arc(point.x * width, point.y * height, 3, 0, Math.PI * 2);
    ctx.fillStyle = "#f97316";
    ctx.fill();
  }

  ctx.restore();
}
