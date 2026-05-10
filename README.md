# Ai Pomodoro

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

## Branching and deployment

| Branch | What runs |
|--------|-----------|
| **`dev`** | **CI** workflow — `npm ci` + **`npm run build`** on each push (catch breakage early). |
| **PR → `master` / `main`** | Same **CI** — must pass before merge if you enable required checks in GitHub branch protection. |
| **`master` / `main`** | **Build, push to ACR, deploy Container App** — Docker image + **`az containerapp update`** (prod only). |

Typical flow: push to **`dev`** (CI runs) → open **PR** into **`master`** (CI runs again) → merge → deploy workflow runs once on **`master`**.

GitHub **Secrets** for prod deploy (Repository → Settings → Secrets and variables → Actions): existing **ACR\_**\* and **VITE\_**\* vars, plus **`AZURE_CREDENTIALS`** (service principal JSON), **`AZURE_RESOURCE_GROUP`**, **`AZURE_CONTAINER_APP_NAME`**. The principal needs permission to update the Container App (and the app’s managed identity already pulls from ACR, or grant AcrPull as needed).

## Notes

- This is an MVP shoulder-width baseline heuristic for forward lean + blink counting.
- It does not store video and runs inference in-browser.
- The pose model is bundled locally at `public/pose_landmarker_lite.task` and served as `/pose_landmarker_lite.task` (avoids hanging on blocked third-party model downloads).
- The face model is bundled locally at `public/face_landmarker.task`.
- MediaPipe WASM is copied into `public/mediapipe-wasm/` on `npm install` / before build (`scripts/copy-mediapipe-wasm.mjs`; that folder is gitignored).

## Project layout

Vite + vanilla ES modules. `@/` in imports maps to `src/` (see `vite.config.js` and `jsconfig.json`).

| Path | Role |
|------|------|
| `index.html` | HTML shell; script entry `/src/main.js` |
| `src/main.js` | Application entry (global CSS import + auth bootstrap) |
| `src/styles/` | Stylesheets (`main.css` imported from `main.js`) |
| `src/config/` | Build-time constants and model paths |
| `src/app/` | Main UI/runtime orchestration (`runApp`) |
| `src/auth/` | MSAL bootstrap |
| `src/core/` | Camera primitives |
| `src/detection/` | MediaPipe landmarker setup |
| `src/posture/` | Shoulder metrics + baseline |
| `src/blink/` | Blink counting |
| `src/eye-tracking/` | Gaze, EAR openness, attention timers |
| `src/render/` | Skeleton overlay |
| `src/ui/` | DOM bindings and controls |
| `public/` | Static assets served as-is (models; WASM copy is gitignored) |
| `scripts/` | Build helpers (MediaPipe WASM sync) |
