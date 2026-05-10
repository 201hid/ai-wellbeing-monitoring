import "@/styles/main.css";
import { bootstrapAuth } from "@/auth/bootstrapAuth.js";
import { runApp } from "@/app";

bootstrapAuth(() => {
  runApp();
});
