const { ErrorCodes, toAutomationError } = require('../domain/errors');
const { errorResponse, okResponse } = require('../server/mcpResponses');

function createKeyboardTools(dependencies) {
  const logger = dependencies.logger || console;
  const robotAdapter = dependencies.robotAdapter;

  return {
    async keyboardType(params) {
      try {
        robotAdapter.typeString(params.text);
        return okResponse();
      } catch (error) {
        const automationError = toAutomationError(
          error,
          ErrorCodes.AUTOMATION_UNAVAILABLE,
          'Failed to type text.',
        );

        logger.error('Error typing text:', automationError);
        return errorResponse(automationError.code, automationError.message);
      }
    },

    async keyboardPress(params) {
      const settings = Object.assign({ modifiers: [] }, params || {});

      try {
        robotAdapter.pressKey(settings.key, settings.modifiers);
        return okResponse();
      } catch (error) {
        const automationError = toAutomationError(
          error,
          ErrorCodes.AUTOMATION_UNAVAILABLE,
          'Failed to press key.',
        );

        logger.error('Error pressing key:', automationError);
        return errorResponse(automationError.code, automationError.message);
      }
    },
  };
}

module.exports = {
  createKeyboardTools,
};