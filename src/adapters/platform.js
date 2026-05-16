const { ErrorCodes } = require('../domain/errors');
const { getKeyboardCompatibility } = require('../domain/keyboard');

function createPlatformAdapter(options = {}) {
  const env = options.env || process.env;
  const platform = options.platform || process.platform;

  function getScreenCaptureAvailability() {
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
  }

  return {
    getScreenCaptureAvailability,
    getDesktopCapabilities(config = {}) {
      const screenCapture = getScreenCaptureAvailability();
      let displayServer = 'native';

      if (platform === 'linux') {
        displayServer = env.WAYLAND_DISPLAY ? 'wayland' : env.DISPLAY ? 'x11' : 'headless';
      }

      return {
        platform,
        displayServer,
        inputEnabled: config.enableInput !== false,
        readOnly: Boolean(config.readOnly),
        dryRun: Boolean(config.dryRun),
        screenCaptureAvailable: screenCapture.available,
        multiMonitorAware: false,
        keyboard: getKeyboardCompatibility(platform),
        mouse: {
          supportsMove: true,
          supportsClick: true,
          supportsDrag: true,
          supportsScroll: true,
          supportsPosition: true,
        },
      };
    },
  };
}

module.exports = {
  createPlatformAdapter,
};