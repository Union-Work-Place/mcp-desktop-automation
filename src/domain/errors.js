const ErrorCodes = {
  AUTOMATION_UNAVAILABLE: 'AUTOMATION_UNAVAILABLE',
  DISPLAY_UNAVAILABLE: 'DISPLAY_UNAVAILABLE',
  INVALID_COORDINATES: 'INVALID_COORDINATES',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  SCREENSHOT_FAILED: 'SCREENSHOT_FAILED',
  SCREENSHOT_NOT_FOUND: 'SCREENSHOT_NOT_FOUND',
  UNSUPPORTED_KEY: 'UNSUPPORTED_KEY',
};

class AutomationError extends Error {
  constructor(code, message, details) {
    super(message);
    this.name = 'AutomationError';
    this.code = code;
    this.details = details;
  }
}

function toAutomationError(error, fallbackCode, fallbackMessage) {
  if (error instanceof AutomationError) {
    return error;
  }

  return new AutomationError(fallbackCode, error && error.message ? error.message : fallbackMessage);
}

module.exports = {
  AutomationError,
  ErrorCodes,
  toAutomationError,
};