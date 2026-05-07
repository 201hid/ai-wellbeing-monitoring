const MAX_LOG_LINES = 300;

function formatTime(ts = Date.now()) {
  const d = new Date(ts);
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${String(d.getMilliseconds()).padStart(3, "0")}`;
}

export function createLogger(logEl) {
  return (message, { level = "info" } = {}) => {
    const prefix =
      level === "error" ? "[ERR]" : level === "warn" ? "[WRN]" : "[INF]";
    const line = `${formatTime()} ${prefix} ${message}\n`;

    if (!logEl) {
      console.log(line.trimEnd());
      return;
    }

    logEl.textContent += line;
    const lines = logEl.textContent.split("\n");
    if (lines.length > MAX_LOG_LINES) {
      logEl.textContent = lines.slice(-MAX_LOG_LINES).join("\n");
    }
    logEl.scrollTop = logEl.scrollHeight;
  };
}
