function parsePositiveInteger(value, fallback) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

function parseBoolean(value, fallback) {
  if (value === undefined) {
    return fallback;
  }

  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }

  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }

  return fallback;
}

function parseList(value) {
  if (!value) {
    return [];
  }

  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseSafeArea(value) {
  if (!value) {
    return null;
  }

  const parts = String(value)
    .split(',')
    .map((item) => Number(item.trim()));

  if (parts.length !== 4 || parts.some((item) => !Number.isFinite(item) || item < 0)) {
    return null;
  }

  return {
    x: parts[0],
    y: parts[1],
    width: parts[2],
    height: parts[3],
  };
}

function createConfig(env = process.env) {
  return {
    enableInput: parseBoolean(env.MCP_DESKTOP_AUTOMATION_ENABLE_INPUT, true),
    readOnly: parseBoolean(env.MCP_DESKTOP_AUTOMATION_READ_ONLY, false),
    dryRun: parseBoolean(env.MCP_DESKTOP_AUTOMATION_DRY_RUN, false),
    allowedTools: parseList(env.MCP_DESKTOP_AUTOMATION_ALLOWED_TOOLS),
    blockedTools: parseList(env.MCP_DESKTOP_AUTOMATION_BLOCKED_TOOLS),
    safeArea: parseSafeArea(env.MCP_DESKTOP_AUTOMATION_SAFE_AREA),
    screenCaptureTimeoutMs: parsePositiveInteger(env.MCP_DESKTOP_AUTOMATION_SCREEN_CAPTURE_TIMEOUT_MS, 15000),
    screenCaptureInlineByDefault: parseBoolean(
      env.MCP_DESKTOP_AUTOMATION_SCREEN_CAPTURE_INLINE_BY_DEFAULT,
      false,
    ),
    screenCaptureMaxInlineBytes: parsePositiveInteger(
      env.MCP_DESKTOP_AUTOMATION_SCREEN_CAPTURE_MAX_INLINE_BYTES,
      256 * 1024,
    ),
    screenshotTtlMs: parsePositiveInteger(env.MCP_DESKTOP_AUTOMATION_SCREENSHOT_TTL_MS, 5 * 60 * 1000),
    screenshotMaxItems: parsePositiveInteger(env.MCP_DESKTOP_AUTOMATION_SCREENSHOT_MAX_ITEMS, 20),
    screenshotMaxBytes: parsePositiveInteger(
      env.MCP_DESKTOP_AUTOMATION_SCREENSHOT_MAX_BYTES,
      10 * 1024 * 1024,
    ),
  };
}

module.exports = {
  createConfig,
};