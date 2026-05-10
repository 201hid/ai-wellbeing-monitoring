import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const src = path.join(root, "node_modules/@mediapipe/tasks-vision/wasm");
const dest = path.join(root, "public/mediapipe-wasm");

if (!fs.existsSync(src)) {
  console.warn(
    "[copy-mediapipe-wasm] Skip: node_modules/@mediapipe/tasks-vision/wasm not found (run npm install)."
  );
  process.exit(0);
}

fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.cpSync(src, dest, { recursive: true });
console.log("[copy-mediapipe-wasm] Copied WASM bundle to public/mediapipe-wasm/");
