const robot = require('robotjs');

function createRobotjsAdapter() {
  return {
    getScreenSize() {
      return robot.getScreenSize();
    },
    moveMouse(x, y) {
      robot.moveMouse(x, y);
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

      robot.keyToggle(key, 'down', modifiers);
      robot.keyToggle(key, 'up');
    },
  };
}

module.exports = {
  createRobotjsAdapter,
};