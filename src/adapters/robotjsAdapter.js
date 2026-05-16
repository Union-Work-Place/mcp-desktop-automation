const robot = require('robotjs');

function createRobotjsAdapter() {
  return {
    getScreenSize() {
      return robot.getScreenSize();
    },
    getMousePosition() {
      return robot.getMousePos();
    },
    moveMouse(x, y) {
      robot.moveMouse(x, y);
    },
    dragMouse(x, y) {
      robot.dragMouse(x, y);
    },
    scrollMouse(x, y) {
      robot.scrollMouse(x, y);
    },
    mouseClick(button, isDoubleClick) {
      if (isDoubleClick) {
        robot.mouseClick(button, isDoubleClick);
        return;
      }

      robot.mouseClick(button);
    },
    typeString(text) {
      robot.typeString(text);
    },
    pressKey(key, modifiers) {
      if (!modifiers || modifiers.length === 0) {
        robot.keyTap(key);
        return;
      }

      robot.keyTap(key, modifiers);
    },
  };
}

module.exports = {
  createRobotjsAdapter,
};