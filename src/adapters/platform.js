const { ErrorCodes } = require('../domain/errors');

function createPlatformAdapter(options = {}) {
  const env = options.env || process.env;
  const platform = options.platform || process.platform;

  return {
    getScreenCaptureAvailability() {
      if (platform !== 'linux') {
        return { available: true };
      }

      if (env.DISPLAY || env.WAYLAND_DISPLAY) {
        return { available: true };
      }

      return {
        available: false,
        code: ErrorCodes.DISPLAY_UNAVAILABLE,
        message: 'Screen capture requires DISPLAY or WAYLAND_DISPLAY on Linux.',
      };
    },
  };
}

module.exports = {
  createPlatformAdapter,
};