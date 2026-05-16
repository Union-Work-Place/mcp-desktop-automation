const { ErrorCodes, toAutomationError } = require('../domain/errors');
const { normalizeKey, normalizeModifiers } = require('../domain/keyboard');
const { assertCoordinatesInBounds, assertPointInSafeArea, assertToolAllowed } = require('../domain/policy');
const { errorResponse, okResponse } = require('../server/mcpResponses');

function createMouseTools(dependencies) {
  const config = dependencies.config || {};
  const logger = dependencies.logger || console;
  const platform = dependencies.platform;
  const robotAdapter = dependencies.robotAdapter;
  const currentPlatform = platform && platform.getDesktopCapabilities
    ? platform.getDesktopCapabilities(config).platform
    : process.platform;

  function getCurrentMousePosition() {
    return typeof robotAdapter.getMousePosition === 'function' ? robotAdapter.getMousePosition() : null;
  }

  function getNormalizedKeySettings(params) {
    const settings = Object.assign({ modifiers: [] }, params || {});

    return {
      key: normalizeKey(settings.key, currentPlatform),
      modifiers: normalizeModifiers(settings.modifiers, currentPlatform),
    };
  }

  return {
    async getMousePosition() {
      try {
        assertToolAllowed('get_mouse_position', config);
        return okResponse({ result: getCurrentMousePosition() });
      } catch (error) {
        const automationError = toAutomationError(
          error,
          ErrorCodes.AUTOMATION_UNAVAILABLE,
          'Failed to get mouse position.',
        );

        logger.error('Error getting mouse position:', automationError);
        return errorResponse(automationError.code, automationError.message, automationError.details);
      }
    },

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
        return errorResponse(automationError.code, automationError.message, automationError.details);
      }
    },

    async mouseDrag(params) {
      try {
        assertToolAllowed('mouse_drag', config, { requiresInput: true });

        const screenSize = robotAdapter.getScreenSize();
        assertCoordinatesInBounds(params, screenSize);
        assertPointInSafeArea(params, config.safeArea);

        if (config.dryRun) {
          return okResponse({ dryRun: true });
        }

        robotAdapter.dragMouse(params.x, params.y);
        return okResponse();
      } catch (error) {
        const automationError = toAutomationError(
          error,
          ErrorCodes.AUTOMATION_UNAVAILABLE,
          'Failed to drag the mouse.',
        );

        logger.error('Error dragging mouse:', automationError);
        return errorResponse(automationError.code, automationError.message, automationError.details);
      }
    },

    async mouseDragWithKeyPress(params) {
      let heldKey = null;

      try {
        assertToolAllowed('mouse_drag_with_key_press', config, { requiresInput: true });

        const screenSize = robotAdapter.getScreenSize();
        assertCoordinatesInBounds(params, screenSize);
        assertPointInSafeArea(params, config.safeArea);

        const normalizedSettings = getNormalizedKeySettings(params);

        if (config.dryRun) {
          return okResponse({
            dryRun: true,
            key: normalizedSettings.key,
            modifiers: normalizedSettings.modifiers,
          });
        }

        heldKey = normalizedSettings;
        robotAdapter.toggleKey(heldKey.key, 'down', heldKey.modifiers);
        robotAdapter.dragMouse(params.x, params.y);
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
          'Failed to drag the mouse while holding a key.',
        );

        logger.error('Error dragging mouse while holding a key:', automationError);
        return errorResponse(automationError.code, automationError.message, automationError.details);
      }
    },

    async mouseScroll(params) {
      const settings = Object.assign({ x: 0, y: 0 }, params || {});

      try {
        assertToolAllowed('mouse_scroll', config, { requiresInput: true });

        if (config.safeArea) {
          assertPointInSafeArea(getCurrentMousePosition(), config.safeArea);
        }

        if (config.dryRun) {
          return okResponse({ dryRun: true });
        }

        robotAdapter.scrollMouse(settings.x, settings.y);
        return okResponse();
      } catch (error) {
        const automationError = toAutomationError(
          error,
          ErrorCodes.AUTOMATION_UNAVAILABLE,
          'Failed to scroll the mouse.',
        );

        logger.error('Error scrolling mouse:', automationError);
        return errorResponse(automationError.code, automationError.message, automationError.details);
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
        return errorResponse(automationError.code, automationError.message, automationError.details);
      }
    },
  };
}

module.exports = {
  createMouseTools,
};
