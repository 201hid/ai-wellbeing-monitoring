import "@/styles/themes.css";
import "@/styles/main.css";
import { bootstrapAuth } from "@/auth/bootstrapAuth.js";
import { runApp } from "@/app";
import { bindThemeToggles, initTheme } from "@/ui/theme.js";

initTheme();
bindThemeToggles();

bootstrapAuth(() => {
  runApp();
});
