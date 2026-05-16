const screenshot = require('screenshot-desktop');

function createScreenshotAdapter() {
  return {
    async capture() {
      return screenshot();
    },
  };
}

module.exports = {
  createScreenshotAdapter,
};