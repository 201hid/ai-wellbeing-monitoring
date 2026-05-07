export async function setupCamera(webcamEl, log = () => {}) {
  log("Requesting camera access...");
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { width: 1280, height: 720 }
  });
  webcamEl.srcObject = stream;
  await webcamEl.play();
  const track = stream.getVideoTracks()[0];
  if (track?.getSettings) {
    log(`Camera ready: ${JSON.stringify(track.getSettings())}`);
  } else {
    log("Camera ready.");
  }
}
