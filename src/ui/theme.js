const STORAGE_KEY = "focusdesk-theme";

export function getTheme() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return "light";
}

export function applyTheme(theme) {
  const next = theme === "dark" ? "dark" : "light";
  document.documentElement.dataset.theme = next;
  localStorage.setItem(STORAGE_KEY, next);
  syncThemeToggleUi(next);
}

export function initTheme() {
  applyTheme(getTheme());
}

function syncThemeToggleUi(theme) {
  document.querySelectorAll("[data-theme-set]").forEach((btn) => {
    const isActive = btn.getAttribute("data-theme-set") === theme;
    btn.classList.toggle("is-active", isActive);
    btn.setAttribute("aria-pressed", isActive ? "true" : "false");
  });
}

export function bindThemeToggles() {
  document.querySelectorAll("[data-theme-set]").forEach((btn) => {
    btn.addEventListener("click", () => {
      applyTheme(btn.getAttribute("data-theme-set"));
    });
  });
}
