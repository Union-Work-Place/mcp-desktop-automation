const screenshot = require('screenshot-desktop');

function createScreenshotAdapter(implementation) {
  const captureScreenshot = implementation || screenshot;

  return {
    async capture(options = {}) {
      const captureOptions = {};

      if (options.displayId !== undefined) {
        captureOptions.screen = options.displayId;
      }

      if (options.format) {
        captureOptions.format = options.format;
      }

      return captureScreenshot(captureOptions);
    },
  };
}

module.exports = {
  createScreenshotAdapter,
};