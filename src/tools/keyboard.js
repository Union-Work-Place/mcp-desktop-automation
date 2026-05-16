const { ErrorCodes, toAutomationError } = require('../domain/errors');
const { normalizeKey, normalizeModifiers } = require('../domain/keyboard');
const { assertToolAllowed } = require('../domain/policy');
const { errorResponse, okResponse } = require('../server/mcpResponses');

function createKeyboardTools(dependencies) {
  const config = dependencies.config || {};
  const logger = dependencies.logger || console;
  const robotAdapter = dependencies.robotAdapter;
  const platform = dependencies.platform;
  const currentPlatform = platform && platform.getDesktopCapabilities
    ? platform.getDesktopCapabilities(config).platform
    : process.platform;

  function getNormalizedKeySettings(params) {
    const settings = Object.assign({ modifiers: [] }, params || {});

    return {
      key: normalizeKey(settings.key, currentPlatform),
      modifiers: normalizeModifiers(settings.modifiers, currentPlatform),
    };
  }

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
      try {
        assertToolAllowed('keyboard_press', config, { requiresInput: true });

        const normalizedSettings = getNormalizedKeySettings(params);

        if (config.dryRun) {
          return okResponse({ dryRun: true, key: normalizedSettings.key, modifiers: normalizedSettings.modifiers });
        }

        robotAdapter.pressKey(normalizedSettings.key, normalizedSettings.modifiers);
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

    async keyboardTypeWithKeyPress(params) {
      let heldKey = null;

      try {
        assertToolAllowed('keyboard_type_with_key_press', config, { requiresInput: true });

        const normalizedSettings = getNormalizedKeySettings(params);

        if (config.dryRun) {
          return okResponse({
            dryRun: true,
            key: normalizedSettings.key,
            modifiers: normalizedSettings.modifiers,
            text: params.text,
          });
        }

        heldKey = normalizedSettings;
        robotAdapter.toggleKey(heldKey.key, 'down', heldKey.modifiers);
        robotAdapter.typeString(params.text);
        robotAdapter.toggleKey(heldKey.key, 'up', heldKey.modifiers);
        heldKey = null;
        return okResponse();
      } catch (error) {
        if (heldKey) {
          try {
            robotAdapter.toggleKey(heldKey.key, 'up', heldKey.modifiers);
          } catch {
            // Best-effort cleanup to avoid leaving the key held down.
          }
        }

        const automationError = toAutomationError(
          error,
          ErrorCodes.AUTOMATION_UNAVAILABLE,
          'Failed to type text while holding a key.',
        );

        logger.error('Error typing text while holding a key:', automationError);
        return errorResponse(automationError.code, automationError.message);
      }
    },
  };
}

module.exports = {
  createKeyboardTools,
};
