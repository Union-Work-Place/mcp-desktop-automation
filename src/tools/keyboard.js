const { ErrorCodes, toAutomationError } = require('../domain/errors');
const { normalizeKey, normalizeModifiers } = require('../domain/keyboard');
const { assertToolAllowed } = require('../domain/policy');
const { errorResponse, okResponse } = require('../server/mcpResponses');

function createKeyboardTools(dependencies) {
  const config = dependencies.config || {};
  const logger = dependencies.logger || console;
  const robotAdapter = dependencies.robotAdapter;
  const platform = dependencies.platform;

  return {
    async keyboardType(params) {
      try {
        assertToolAllowed('keyboard_type', config, { requiresInput: true });

        if (config.dryRun) {
          return okResponse({ dryRun: true });
        }

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
        assertToolAllowed('keyboard_press', config, { requiresInput: true });

        const normalizedKey = normalizeKey(settings.key);
        const normalizedModifiers = normalizeModifiers(settings.modifiers, platform && platform.getDesktopCapabilities
          ? platform.getDesktopCapabilities(config).platform
          : process.platform);

        if (config.dryRun) {
          return okResponse({ dryRun: true, key: normalizedKey, modifiers: normalizedModifiers });
        }

        robotAdapter.pressKey(normalizedKey, normalizedModifiers);
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