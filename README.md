# AI Wellbeing Monitoring

Simple browser app that:

- uses your webcam feed
- tracks body joints using MediaPipe Pose
- draws connector lines between major joints
- shows a basic posture quality status
- provides a production-style dashboard for posture and eye tracking metrics

## Run

```bash
npm install
npm run dev
```

Then open the local URL shown in terminal and allow camera permission.

## Notes

- This is an MVP shoulder-width baseline heuristic for forward lean + blink counting.
- It does not store video and runs inference in-browser.
- The pose model is bundled locally at `public/pose_landmarker_lite.task` and served as `/pose_landmarker_lite.task` (avoids hanging on blocked third-party model downloads).
- The face model is bundled locally at `public/face_landmarker.task`.
- UI log panel removed for cleaner production UX.

## Project Structure

- `main.js`: minimal entrypoint
- `src/app.js`: top-level runtime orchestration
- `src/core/`: camera/runtime primitives
- `src/detection/`: MediaPipe landmarker setup
- `src/posture/`: shoulder metric + baseline capture logic
- `src/blink/`: blink counting
- `src/eyeTracking/`: gaze, EAR openness, attention timers
- `src/render/`: skeleton overlay drawing
- `src/ui/`: DOM lookups and reusable UI control bindings
