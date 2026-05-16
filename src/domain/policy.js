const { AutomationError, ErrorCodes } = require('./errors');

function assertToolAllowed(toolName, config, options = {}) {
  const allowedTools = config.allowedTools || [];
  const blockedTools = config.blockedTools || [];

  if (allowedTools.length > 0 && !allowedTools.includes(toolName)) {
    throw new AutomationError(
      ErrorCodes.PERMISSION_DENIED,
      `Tool ${toolName} is not allowed by configuration.`,
      { tool: toolName, reason: 'not-allowed' },
    );
  }

  if (blockedTools.includes(toolName)) {
    throw new AutomationError(
      ErrorCodes.PERMISSION_DENIED,
      `Tool ${toolName} is disabled by configuration.`,
      { tool: toolName, reason: 'blocked' },
    );
  }

  if (options.requiresInput && config.enableInput === false) {
    throw new AutomationError(
      ErrorCodes.PERMISSION_DENIED,
      'Desktop input tools are disabled by configuration.',
      { tool: toolName, reason: 'input-disabled' },
    );
  }

  if (options.requiresInput && config.readOnly) {
    throw new AutomationError(
      ErrorCodes.PERMISSION_DENIED,
      'Server is running in read-only mode.',
      { tool: toolName, reason: 'read-only' },
    );
  }
}

function assertCoordinatesInBounds(point, screenSize) {
  if (!point || !screenSize) {
    return;
  }

  if (
    !Number.isFinite(point.x) ||
    !Number.isFinite(point.y) ||
    point.x < 0 ||
    point.y < 0 ||
    point.x >= screenSize.width ||
    point.y >= screenSize.height
  ) {
    throw new AutomationError(ErrorCodes.INVALID_COORDINATES, 'Coordinates are outside of the screen bounds.', {
      point,
      screenSize,
    });
  }
}

function assertPointInSafeArea(point, safeArea) {
  if (!point || !safeArea) {
    return;
  }

  const withinX = point.x >= safeArea.x && point.x < safeArea.x + safeArea.width;
  const withinY = point.y >= safeArea.y && point.y < safeArea.y + safeArea.height;

  if (!withinX || !withinY) {
    throw new AutomationError(
      ErrorCodes.PERMISSION_DENIED,
      'Mouse action is outside of the configured safe area.',
      { point, safeArea },
    );
  }
}

module.exports = {
  assertCoordinatesInBounds,
  assertPointInSafeArea,
  assertToolAllowed,
};