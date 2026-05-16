const fs = require('node:fs');

const { ErrorCodes } = require('../domain/errors');
const { getKeyboardCompatibility } = require('../domain/keyboard');

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

function listX11Displays(readdirSync, x11SocketDir) {
  try {
    return readdirSync(x11SocketDir)
      .map((entry) => (typeof entry === 'string' ? entry : entry.name))
      .map((entry) => {
        const match = /^X(\d+)$/.exec(entry);
        return match ? Number(match[1]) : null;
      })
      .filter((entry) => Number.isFinite(entry))
      .sort((left, right) => left - right)
      .map((entry) => `:${entry}`);
  } catch (_error) {
    return [];
  }
}

function resolveLinuxSession(env, options) {
  const configuredDisplay = env.MCP_DESKTOP_AUTOMATION_DISPLAY || env.DISPLAY;
  if (configuredDisplay) {
    return {
      displayServer: 'x11',
      runtimeEnvironment: { DISPLAY: configuredDisplay },
    };
  }

  if (env.WAYLAND_DISPLAY) {
    return {
      displayServer: 'wayland',
      runtimeEnvironment: { WAYLAND_DISPLAY: env.WAYLAND_DISPLAY },
    };
  }

  if (!parseBoolean(env.MCP_DESKTOP_AUTOMATION_AUTO_DETECT_DISPLAY, true)) {
    return {
      displayServer: 'headless',
      runtimeEnvironment: {},
    };
  }

  const readdirSync = options.readdirSync || fs.readdirSync;
  const x11SocketDir = options.x11SocketDir || '/tmp/.X11-unix';
  const displays = listX11Displays(readdirSync, x11SocketDir);
  if (displays[0]) {
    return {
      displayServer: 'x11',
      runtimeEnvironment: { DISPLAY: displays[0] },
    };
  }

  return {
    displayServer: 'headless',
    runtimeEnvironment: {},
  };
}

function createPlatformAdapter(options = {}) {
  const env = options.env || process.env;
  const platform = options.platform || process.platform;
  const linuxSession = platform === 'linux' ? resolveLinuxSession(env, options) : null;

  function getScreenCaptureAvailability() {
    if (platform !== 'linux') {
      return { available: true };
    }

    if (linuxSession.displayServer !== 'headless') {
      return {
        available: true,
        runtimeEnvironment: linuxSession.runtimeEnvironment,
      };
    }

    return {
      available: false,
      code: ErrorCodes.DISPLAY_UNAVAILABLE,
      message: 'Screen capture requires DISPLAY or WAYLAND_DISPLAY on Linux.',
    };
  }

  function getRuntimeEnvironment() {
    if (platform !== 'linux') {
      return {};
    }

    return Object.assign({}, linuxSession.runtimeEnvironment);
  }

  return {
    getScreenCaptureAvailability,
    getRuntimeEnvironment,
    getDesktopCapabilities(config = {}) {
      const screenCapture = getScreenCaptureAvailability();
      let displayServer = 'native';

      if (platform === 'linux') {
        displayServer = linuxSession.displayServer;
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