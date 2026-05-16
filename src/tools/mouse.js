const { ErrorCodes, toAutomationError } = require('../domain/errors');
const { assertCoordinatesInBounds, assertPointInSafeArea, assertToolAllowed } = require('../domain/policy');
const { errorResponse, okResponse } = require('../server/mcpResponses');

function createMouseTools(dependencies) {
  const config = dependencies.config || {};
  const logger = dependencies.logger || console;
  const robotAdapter = dependencies.robotAdapter;

  return {
    async mouseMove(params) {
      try {
        assertToolAllowed('mouse_move', config, { requiresInput: true });

        const screenSize = robotAdapter.getScreenSize();
        assertCoordinatesInBounds(params, screenSize);
        assertPointInSafeArea(params, config.safeArea);

        if (config.dryRun) {
          return okResponse({ dryRun: true });
        }

        robotAdapter.moveMouse(params.x, params.y);
        return okResponse();
      } catch (error) {
        const automationError = toAutomationError(
          error,
          ErrorCodes.AUTOMATION_UNAVAILABLE,
          'Failed to move the mouse.',
        );

        logger.error('Error moving mouse:', automationError);
        return errorResponse(automationError.code, automationError.message);
      }
    },

    async mouseClick(params) {
      const settings = Object.assign({ button: 'left', double: false }, params || {});

      try {
        assertToolAllowed('mouse_click', config, { requiresInput: true });

        if (config.safeArea && typeof robotAdapter.getMousePosition === 'function') {
          assertPointInSafeArea(robotAdapter.getMousePosition(), config.safeArea);
        }

        if (config.dryRun) {
          return okResponse({ dryRun: true });
        }

        robotAdapter.mouseClick(settings.button, settings.double);
        return okResponse();
      } catch (error) {
        const automationError = toAutomationError(
          error,
          ErrorCodes.AUTOMATION_UNAVAILABLE,
          'Failed to click the mouse.',
        );

        logger.error('Error clicking mouse:', automationError);
        return errorResponse(automationError.code, automationError.message);
      }
    },
  };
}

module.exports = {
  createMouseTools,
};