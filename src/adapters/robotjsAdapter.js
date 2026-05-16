const robot = require('robotjs');

function createRobotjsAdapter(implementation) {
  const robotApi = implementation || robot;

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
      robotApi.typeString(text);
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
