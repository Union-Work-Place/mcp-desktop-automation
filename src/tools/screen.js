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

  function wait(delayMs) {
    return new Promise((resolve) => {
      setTimeout(resolve, delayMs);
    });
  }

  function buildScreenshotPayload(screenshot, inlineImageIncluded) {
    return {
      screenshotId: screenshot.id,
      resourceUri: `screenshot://${screenshot.id}`,
      createdAt: screenshot.createdAt,
      expiresAt: screenshot.expiresAt,
      mimeType: screenshot.mimeType,
      byteSize: screenshot.byteSize,
      width: screenshot.width,
      height: screenshot.height,
      displayId: screenshot.displayId,
      inlineImageIncluded: Boolean(inlineImageIncluded),
    };
  }

  function buildCaptureOptions(params) {
    return Object.assign(
      {
        includeImage: config.screenCaptureInlineByDefault,
        format: 'png',
      },
      params || {},
    );
  }

  async function storeScreenshot(imageBuffer, settings) {
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
    return screenshot;
  }

  function toCaptureResponse(screenshot, settings, message) {
    const payload = Object.assign(buildScreenshotPayload(screenshot, false), {
      message,
    });

    if (settings.includeImage && screenshot.byteSize <= config.screenCaptureMaxInlineBytes) {
      payload.inlineImageIncluded = true;

      return imageResponse(payload, {
        mimeType: screenshot.mimeType,
        data: screenshot.data,
      });
    }

    return okResponse(payload);
  }

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

    async getServerStatus() {
      try {
        assertToolAllowed('get_server_status', config);

        return okResponse({
          result: {
            nodeVersion: process.versions.node,
            platform: platform.getDesktopCapabilities(config),
            screenshotStore: screenshotStore.stats(),
          },
        });
      } catch (error) {
        const automationError = toAutomationError(
          error,
          ErrorCodes.AUTOMATION_UNAVAILABLE,
          'Failed to get server status.',
        );

        logger.error('Error getting server status:', automationError);
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
      const settings = buildCaptureOptions(params);

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
        const screenshot = await storeScreenshot(imageBuffer, settings);

        return toCaptureResponse(screenshot, settings, `Screenshot ${screenshot.id} taken.`);
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

    async waitForScreenChange(params) {
      const settings = buildCaptureOptions(params);
      const timeoutMs = params && params.timeoutMs ? params.timeoutMs : config.waitForScreenChangeTimeoutMs;
      const pollIntervalMs = params && params.pollIntervalMs ? params.pollIntervalMs : config.waitForScreenChangePollIntervalMs;

      try {
        assertToolAllowed('wait_for_screen_change', config);
      } catch (error) {
        return errorResponse(error.code, error.message, error.details);
      }

      const availability = platform.getScreenCaptureAvailability();
      if (!availability.available) {
        return errorResponse(availability.code, availability.message);
      }

      try {
        const baseline = await captureWithTimeout(settings);
        const deadline = Date.now() + timeoutMs;

        while (Date.now() < deadline) {
          await wait(pollIntervalMs);
          const nextImage = await captureWithTimeout(settings);

          if (!baseline.equals(nextImage)) {
            const screenshot = await storeScreenshot(nextImage, settings);

            return toCaptureResponse(screenshot, settings, `Screen changed and screenshot ${screenshot.id} was captured.`);
          }
        }

        return errorResponse(ErrorCodes.SCREENSHOT_FAILED, 'Timed out waiting for screen change.', {
          timeoutMs,
          pollIntervalMs,
        });
      } catch (error) {
        const automationError = toAutomationError(
          error,
          ErrorCodes.SCREENSHOT_FAILED,
          'Failed while waiting for screen change.',
        );

        logger.error('Error waiting for screen change:', automationError);
        return errorResponse(automationError.code, automationError.message, automationError.details);
      }
    },
  };
}

module.exports = {
  createScreenTools,
};