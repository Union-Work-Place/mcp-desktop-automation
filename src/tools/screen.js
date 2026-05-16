const { clearTimeout, setTimeout } = require('node:timers');

const { ErrorCodes, toAutomationError } = require('../domain/errors');
const { assertToolAllowed } = require('../domain/policy');
const { errorResponse, imageResponse, okResponse } = require('../server/mcpResponses');

function createScreenTools(dependencies) {
  const config = dependencies.config || {};
  const platform = dependencies.platform;
  const screenshotAdapter = dependencies.screenshotAdapter;
  const screenshotStore = dependencies.screenshotStore;
  const robotAdapter = dependencies.robotAdapter;
  const notifyResourcesChanged = dependencies.notifyResourcesChanged || (async () => {});
  const logger = dependencies.logger || console;

  async function captureWithTimeout(options) {
    const timeoutMs = config.screenCaptureTimeoutMs || 15000;

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Screen capture timed out after ${timeoutMs}ms.`));
      }, timeoutMs);

      screenshotAdapter
        .capture(options)
        .then((result) => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  return {
    async getDesktopCapabilities() {
      try {
        assertToolAllowed('get_desktop_capabilities', config);
        return okResponse({ result: platform.getDesktopCapabilities(config) });
      } catch (error) {
        const automationError = toAutomationError(
          error,
          ErrorCodes.AUTOMATION_UNAVAILABLE,
          'Failed to get desktop capabilities.',
        );

        logger.error('Error getting desktop capabilities:', automationError);
        return errorResponse(automationError.code, automationError.message, automationError.details);
      }
    },

    async getScreenSize() {
      try {
        assertToolAllowed('get_screen_size', config);
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

    async screenCapture(params) {
      const settings = Object.assign(
        {
          includeImage: config.screenCaptureInlineByDefault,
          format: 'png',
        },
        params || {},
      );

      try {
        assertToolAllowed('screen_capture', config);
      } catch (error) {
        return errorResponse(error.code, error.message, error.details);
      }

      const availability = platform.getScreenCaptureAvailability();
      if (!availability.available) {
        return errorResponse(availability.code, availability.message);
      }

      try {
        const imageBuffer = await captureWithTimeout(settings);
        const screenSize = robotAdapter.getScreenSize();
        const mimeType = settings.format === 'jpg' || settings.format === 'jpeg' ? 'image/jpeg' : 'image/png';
        const screenshot = screenshotStore.save(imageBuffer.toString('base64'), {
          mimeType,
          width: screenSize.width,
          height: screenSize.height,
          format: settings.format,
          displayId: settings.displayId,
        });

        await notifyResourcesChanged();

        const payload = {
          screenshotId: screenshot.id,
          resourceUri: `screenshot://${screenshot.id}`,
          createdAt: screenshot.createdAt,
          expiresAt: screenshot.expiresAt,
          mimeType: screenshot.mimeType,
          byteSize: screenshot.byteSize,
          width: screenshot.width,
          height: screenshot.height,
          displayId: screenshot.displayId,
          inlineImageIncluded: false,
          message: `Screenshot ${screenshot.id} taken.`,
        };

        if (settings.includeImage && screenshot.byteSize <= config.screenCaptureMaxInlineBytes) {
          payload.inlineImageIncluded = true;

          return imageResponse(payload, {
            mimeType: screenshot.mimeType,
            data: screenshot.data,
          });
        }

        return okResponse(payload);
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