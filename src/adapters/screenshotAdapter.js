const screenshot = require('screenshot-desktop');

function createScreenshotAdapter() {
  return {
    async capture(options = {}) {
      const captureOptions = {};

      if (options.displayId !== undefined) {
        captureOptions.screen = options.displayId;
      }

      if (options.format) {
        captureOptions.format = options.format;
      }

      return screenshot(captureOptions);
    },
  };
}

module.exports = {
  createScreenshotAdapter,
};