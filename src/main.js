import "@/styles/main.css";
import { bootstrapAuth } from "@/auth/bootstrapAuth.js";
import { runApp } from "@/app";
import { initPomodoroSetup } from "@/pomodoro/setup.js";

bootstrapAuth(() => {
  initPomodoroSetup((aiSession) => {
    runApp(aiSession);
  });
});
