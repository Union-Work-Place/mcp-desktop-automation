const test = require('node:test');
const assert = require('node:assert/strict');
const { Buffer } = require('node:buffer');

const { createKeyboardTools } = require('../../src/tools/keyboard');
const { createMouseTools } = require('../../src/tools/mouse');
const { createScreenTools } = require('../../src/tools/screen');

function getPayload(response) {
  return JSON.parse(response.content[0].text);
}

test('screen tools are testable without MCP process', async () => {
  let resourceNotificationCount = 0;
  const tools = createScreenTools({
    config: { screenCaptureTimeoutMs: 100 },
    logger: { error() {} },
    platform: {
      getScreenCaptureAvailability() {
        return { available: true };
      },
    },
    robotAdapter: {
      getScreenSize() {
        return { width: 100, height: 50 };
      },
    },
    screenshotAdapter: {
      async capture() {
        return Buffer.from('test-image');
      },
    },
    screenshotStore: {
      save(data) {
        return { id: 'screenshot-1', data, mimeType: 'image/png', createdAt: 'now' };
      },
    },
    async notifyResourcesChanged() {
      resourceNotificationCount += 1;
    },
  });

  const screenSizeResponse = await tools.getScreenSize();
  const screenshotResponse = await tools.screenCapture();

  assert.deepEqual(getPayload(screenSizeResponse), {
    success: true,
    result: { width: 100, height: 50 },
  });
  assert.equal(getPayload(screenshotResponse).success, true);
  assert.equal(screenshotResponse.content[1].type, 'image');
  assert.equal(resourceNotificationCount, 1);
});

test('screen_capture returns DISPLAY_UNAVAILABLE in headless Linux mode', async () => {
  const tools = createScreenTools({
    config: { screenCaptureTimeoutMs: 100 },
    logger: { error() {} },
    platform: {
      getScreenCaptureAvailability() {
        return {
          available: false,
          code: 'DISPLAY_UNAVAILABLE',
          message: 'missing display',
        };
      },
    },
    robotAdapter: {},
    screenshotAdapter: {},
    screenshotStore: {},
  });

  const response = await tools.screenCapture();
  const payload = getPayload(response);

  assert.equal(response.isError, true);
  assert.equal(payload.success, false);
  assert.equal(payload.error.code, 'DISPLAY_UNAVAILABLE');
});

test('screen_capture returns SCREENSHOT_FAILED on timeout', async () => {
  const tools = createScreenTools({
    config: { screenCaptureTimeoutMs: 5 },
    logger: { error() {} },
    platform: {
      getScreenCaptureAvailability() {
        return { available: true };
      },
    },
    robotAdapter: {},
    screenshotAdapter: {
      async capture() {
        return new Promise(() => {});
      },
    },
    screenshotStore: {
      save() {
        throw new Error('should not save');
      },
    },
  });

  const response = await tools.screenCapture();
  const payload = getPayload(response);

  assert.equal(response.isError, true);
  assert.equal(payload.success, false);
  assert.equal(payload.error.code, 'SCREENSHOT_FAILED');
  assert.match(payload.error.message, /timed out/i);
});

test('mouse and keyboard tools return MCP errors on adapter failures', async () => {
  const mouseTools = createMouseTools({
    logger: { error() {} },
    robotAdapter: {
      moveMouse() {
        throw new Error('mouse unavailable');
      },
      mouseClick() {
        throw new Error('click unavailable');
      },
    },
  });
  const keyboardTools = createKeyboardTools({
    logger: { error() {} },
    robotAdapter: {
      typeString() {
        throw new Error('type unavailable');
      },
      pressKey() {
        throw new Error('key unavailable');
      },
    },
  });

  const moveResponse = await mouseTools.mouseMove({ x: 1, y: 2 });
  const clickResponse = await mouseTools.mouseClick({ button: 'left' });
  const typeResponse = await keyboardTools.keyboardType({ text: 'hello' });
  const keyResponse = await keyboardTools.keyboardPress({ key: 'a', modifiers: [] });

  assert.equal(moveResponse.isError, true);
  assert.equal(clickResponse.isError, true);
  assert.equal(typeResponse.isError, true);
  assert.equal(keyResponse.isError, true);
  assert.equal(getPayload(moveResponse).error.code, 'AUTOMATION_UNAVAILABLE');
  assert.equal(getPayload(clickResponse).error.code, 'AUTOMATION_UNAVAILABLE');
  assert.equal(getPayload(typeResponse).error.code, 'AUTOMATION_UNAVAILABLE');
  assert.equal(getPayload(keyResponse).error.code, 'AUTOMATION_UNAVAILABLE');
});