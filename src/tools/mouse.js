const { ErrorCodes, toAutomationError } = require('../domain/errors');
const { errorResponse, okResponse } = require('../server/mcpResponses');

function createMouseTools(dependencies) {
  const logger = dependencies.logger || console;
  const robotAdapter = dependencies.robotAdapter;

  return {
    async mouseMove(params) {
      try {
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