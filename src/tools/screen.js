const { ErrorCodes, toAutomationError } = require('../domain/errors');
const { errorResponse, imageResponse, okResponse } = require('../server/mcpResponses');

function createScreenTools(dependencies) {
  const config = dependencies.config || {};
  const platform = dependencies.platform;
  const screenshotAdapter = dependencies.screenshotAdapter;
  const screenshotStore = dependencies.screenshotStore;
  const robotAdapter = dependencies.robotAdapter;
  const notifyResourcesChanged = dependencies.notifyResourcesChanged || (async () => {});
  const logger = dependencies.logger || console;

  async function captureWithTimeout() {
    const timeoutMs = config.screenCaptureTimeoutMs || 15000;

    return Promise.race([
      screenshotAdapter.capture(),
      new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Screen capture timed out after ${timeoutMs}ms.`));
        }, timeoutMs);
      }),
    ]);
  }

  return {
    async getScreenSize() {
      try {
        return okResponse({ result: robotAdapter.getScreenSize() });
      } catch (error) {
        const automationError = toAutomationError(
          error,
          ErrorCodes.AUTOMATION_UNAVAILABLE,
          'Failed to read screen size.',
        );

        logger.error('Error getting screen size:', automationError);
        return errorResponse(automationError.code, automationError.message);
      }
    },

    async screenCapture() {
      const availability = platform.getScreenCaptureAvailability();
      if (!availability.available) {
        return errorResponse(availability.code, availability.message);
      }

      try {
        const imageBuffer = await captureWithTimeout();
        const screenshot = screenshotStore.save(imageBuffer.toString('base64'));

        await notifyResourcesChanged();

        return imageResponse(
          {
            screenshotId: screenshot.id,
            createdAt: screenshot.createdAt,
            message: `Screenshot ${screenshot.id} taken.`,
          },
          {
            mimeType: screenshot.mimeType,
            data: screenshot.data,
          },
        );
      } catch (error) {
        const automationError = toAutomationError(
          error,
          ErrorCodes.SCREENSHOT_FAILED,
          'Failed to capture screenshot.',
        );

        logger.error('Error capturing screen:', automationError);
        return errorResponse(automationError.code, automationError.message);
      }
    },
  };
}

module.exports = {
  createScreenTools,
};