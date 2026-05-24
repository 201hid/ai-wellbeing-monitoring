/** Hidden canvas with a WebGL context for MediaPipe Tasks (Chrome/iOS GLctx workaround). */
let bindingCanvas = null;

export function acquireMediaPipeCanvas(log = () => {}) {
  if (bindingCanvas) return bindingCanvas;

  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.cssText =
    "position:fixed;left:-9999px;width:1px;height:1px;opacity:0;pointer-events:none;";
  document.body.appendChild(canvas);

  const gl =
    canvas.getContext("webgl2", {
      antialias: false,
      alpha: false,
      preserveDrawingBuffer: true
    }) ??
    canvas.getContext("webgl", {
      antialias: false,
      alpha: false,
      preserveDrawingBuffer: true
    });

  if (gl) {
    log("MediaPipe binding canvas: WebGL context created.");
  } else {
    log("MediaPipe binding canvas: WebGL unavailable (CPU path may still fail in Chrome).", {
      level: "warn"
    });
  }

  bindingCanvas = canvas;
  return canvas;
}
