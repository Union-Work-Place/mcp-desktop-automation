const robot = require('robotjs');
const { planTextKeystrokes } = require('../domain/keyboard');

function createRobotjsAdapter(implementation, options = {}) {
  const robotApi = implementation || robot;
  const platform = options.platform || process.platform;

  return {
    getScreenSize() {
      return robotApi.getScreenSize();
    },
    getMousePosition() {
      return robotApi.getMousePos();
    },
    moveMouse(x, y) {
      robotApi.moveMouse(x, y);
    },
    dragMouse(x, y) {
      robotApi.dragMouse(x, y);
    },
    scrollMouse(x, y) {
      robotApi.scrollMouse(x, y);
    },
    mouseClick(button, isDoubleClick) {
      if (isDoubleClick) {
        robotApi.mouseClick(button, isDoubleClick);
        return;
      }

      robotApi.mouseClick(button);
    },
    typeString(text) {
      const actions = planTextKeystrokes(text, platform);
      for (const action of actions) {
        if (action.type === 'keyTap' && typeof robotApi.keyTap === 'function') {
          robotApi.keyTap(action.key, action.modifiers);
        } else if (typeof robotApi.typeString === 'function') {
          robotApi.typeString(action.text || action.raw || action.key);
        }
      }
    },
    pressKey(key, modifiers) {
      if (!modifiers || modifiers.length === 0) {
        robotApi.keyTap(key);
        return;
      }

      robotApi.keyTap(key, modifiers);
    },
    toggleKey(key, action, modifiers) {
      if (!modifiers || modifiers.length === 0) {
        robotApi.keyToggle(key, action);
        return;
      }

      robotApi.keyToggle(key, action, modifiers);
    },
  };
}

module.exports = {
  createRobotjsAdapter,
};
