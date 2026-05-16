function parsePositiveInteger(value, fallback) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

function createConfig(env = process.env) {
  return {
    screenCaptureTimeoutMs: parsePositiveInteger(env.MCP_DESKTOP_AUTOMATION_SCREEN_CAPTURE_TIMEOUT_MS, 15000),
  };
}

module.exports = {
  createConfig,
};