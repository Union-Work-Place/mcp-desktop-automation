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
    config: { screenCaptureTimeoutMs: 100, screenCaptureInlineByDefault: false, screenCaptureMaxInlineBytes: 1024 },
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
      save(data, metadata) {
        return {
          id: 'screenshot-1',
          data,
          mimeType: metadata.mimeType,
          createdAt: 'now',
          expiresAt: 'later',
          byteSize: 10,
          width: metadata.width,
          height: metadata.height,
          displayId: metadata.displayId,
        };
      },
    },
    async notifyResourcesChanged() {
      resourceNotificationCount += 1;
    },
  });

  const screenSizeResponse = await tools.getScreenSize();
  const screenshotResponse = await tools.screenCapture({ includeImage: true });

  assert.deepEqual(getPayload(screenSizeResponse), {
    success: true,
    result: { width: 100, height: 50 },
  });
  assert.equal(getPayload(screenshotResponse).success, true);
  assert.equal(getPayload(screenshotResponse).inlineImageIncluded, true);
  assert.equal(screenshotResponse.content[1].type, 'image');
  assert.equal(resourceNotificationCount, 1);
});

test('screen_capture returns metadata and resource link when inline image is disabled', async () => {
  const tools = createScreenTools({
    config: { screenCaptureTimeoutMs: 100, screenCaptureInlineByDefault: false, screenCaptureMaxInlineBytes: 4 },
    logger: { error() {} },
    platform: {
      getScreenCaptureAvailability() {
        return { available: true };
      },
    },
    robotAdapter: {
      getScreenSize() {
        return { width: 10, height: 10 };
      },
    },
    screenshotAdapter: {
      async capture() {
        return Buffer.from('longer-image');
      },
    },
    screenshotStore: {
      save() {
        return {
          id: 'screenshot-2',
          data: 'data',
          mimeType: 'image/png',
          createdAt: 'now',
          expiresAt: 'later',
          byteSize: 20,
          width: 10,
          height: 10,
          displayId: null,
        };
      },
    },
  });

  const response = await tools.screenCapture();
  const payload = getPayload(response);

  assert.equal(response.isError, false);
  assert.equal(response.content.length, 1);
  assert.equal(payload.resourceUri, 'screenshot://screenshot-2');
  assert.equal(payload.inlineImageIncluded, false);
});

test('screen tools expose status and wait_for_screen_change behaviors', async () => {
  const captures = [Buffer.from('same'), Buffer.from('same'), Buffer.from('changed')];
  const stored = [];
  const tools = createScreenTools({
    config: {
      screenCaptureTimeoutMs: 100,
      screenCaptureInlineByDefault: false,
      screenCaptureMaxInlineBytes: 1024,
      waitForScreenChangeTimeoutMs: 50,
      waitForScreenChangePollIntervalMs: 1,
    },
    logger: { error() {} },
    platform: {
      getScreenCaptureAvailability() {
        return { available: true };
      },
      getDesktopCapabilities() {
        return { platform: 'linux', inputEnabled: true };
      },
    },
    robotAdapter: {
      getScreenSize() {
        return { width: 10, height: 10 };
      },
    },
    screenshotAdapter: {
      async capture() {
        return captures.shift();
      },
    },
    screenshotStore: {
      save(data, metadata) {
        const record = {
          id: 'stored-' + String(stored.length + 1),
          data,
          mimeType: metadata.mimeType,
          createdAt: 'now',
          expiresAt: 'later',
          byteSize: 7,
          width: metadata.width,
          height: metadata.height,
          displayId: metadata.displayId,
        };
        stored.push(record);
        return record;
      },
      stats() {
        return { count: stored.length };
      },
    },
    async notifyResourcesChanged() {},
  });

  const statusResponse = await tools.getServerStatus();
  const waitResponse = await tools.waitForScreenChange({ pollIntervalMs: 5, timeoutMs: 250 });

  assert.equal(getPayload(statusResponse).success, true);
  assert.equal(getPayload(statusResponse).result.platform.platform, 'linux');
  assert.equal(waitResponse.isError, false);
  assert.equal(getPayload(waitResponse).screenshotId, 'stored-1');
});

test('screen tools handle jpeg capture options and wait timeout details', async () => {
  let savedMetadata = null;
  const tools = createScreenTools({
    config: {
      screenCaptureTimeoutMs: 100,
      screenCaptureInlineByDefault: true,
      screenCaptureMaxInlineBytes: 1024,
      waitForScreenChangeTimeoutMs: 20,
      waitForScreenChangePollIntervalMs: 1,
    },
    logger: { error() {} },
    platform: {
      getScreenCaptureAvailability() {
        return { available: true };
      },
      getDesktopCapabilities() {
        return { platform: 'linux', inputEnabled: true };
      },
    },
    robotAdapter: {
      getScreenSize() {
        return { width: 8, height: 6 };
      },
    },
    screenshotAdapter: {
      async capture() {
        return Buffer.from('jpeg-image');
      },
    },
    screenshotStore: {
      save(data, metadata) {
        savedMetadata = metadata;
        return {
          id: 'jpeg-shot',
          data,
          mimeType: metadata.mimeType,
          createdAt: 'now',
          expiresAt: 'later',
          byteSize: 10,
          width: metadata.width,
          height: metadata.height,
          displayId: metadata.displayId,
        };
      },
      stats() {
        return { count: 1 };
      },
    },
    async notifyResourcesChanged() {},
  });

  const captureResponse = await tools.screenCapture({ format: 'jpg', displayId: 'main' });
  const waitResponse = await tools.waitForScreenChange({ timeoutMs: 20, pollIntervalMs: 1 });

  assert.equal(captureResponse.isError, false);
  assert.equal(captureResponse.content[1].type, 'image');
  assert.deepEqual(savedMetadata, {
    mimeType: 'image/jpeg',
    width: 8,
    height: 6,
    format: 'jpg',
    displayId: 'main',
  });
  assert.equal(waitResponse.isError, true);
  assert.equal(getPayload(waitResponse).error.code, 'SCREENSHOT_FAILED');
  assert.equal(getPayload(waitResponse).error.details.timeoutMs, 20);
  assert.equal(getPayload(waitResponse).error.details.pollIntervalMs, 1);
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
    config: { screenCaptureTimeoutMs: 5, screenCaptureInlineByDefault: false, screenCaptureMaxInlineBytes: 1024 },
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

test('mouse tools enforce bounds, safe area, and dry-run policy', async () => {
  let moveCount = 0;
  let clickCount = 0;
  let dragCount = 0;
  let scrollCount = 0;
  const mouseTools = createMouseTools({
    config: { dryRun: true, safeArea: { x: 10, y: 10, width: 50, height: 50 } },
    logger: { error() {} },
    robotAdapter: {
      getScreenSize() {
        return { width: 100, height: 100 };
      },
      getMousePosition() {
        return { x: 20, y: 20 };
      },
      moveMouse() {
        moveCount += 1;
      },
      dragMouse() {
        dragCount += 1;
      },
      scrollMouse() {
        scrollCount += 1;
      },
      mouseClick() {
        clickCount += 1;
      },
    },
  });

  const dryRunMove = await mouseTools.mouseMove({ x: 25, y: 25 });
  const outOfBoundsMove = await mouseTools.mouseMove({ x: 500, y: 10 });
  const dryRunDrag = await mouseTools.mouseDrag({ x: 25, y: 25 });
  const dryRunScroll = await mouseTools.mouseScroll({ x: 0, y: -2 });
  const mousePosition = await mouseTools.getMousePosition();
  const dryRunClick = await mouseTools.mouseClick({ button: 'left', double: false });

  assert.equal(getPayload(dryRunMove).dryRun, true);
  assert.equal(getPayload(dryRunDrag).dryRun, true);
  assert.equal(getPayload(dryRunScroll).dryRun, true);
  assert.equal(getPayload(dryRunClick).dryRun, true);
  assert.deepEqual(getPayload(mousePosition).result, { x: 20, y: 20 });
  assert.equal(outOfBoundsMove.isError, true);
  assert.equal(getPayload(outOfBoundsMove).error.code, 'INVALID_COORDINATES');
  assert.equal(moveCount, 0);
  assert.equal(clickCount, 0);
  assert.equal(dragCount, 0);
  assert.equal(scrollCount, 0);
});

test('mouse tools execute operations and apply current-position safe-area checks', async () => {
  const calls = [];
  const mouseTools = createMouseTools({
    config: { safeArea: { x: 10, y: 10, width: 40, height: 40 } },
    logger: { error() {} },
    robotAdapter: {
      getScreenSize() {
        return { width: 100, height: 100 };
      },
      getMousePosition() {
        return { x: 20, y: 20 };
      },
      moveMouse(x, y) {
        calls.push(['moveMouse', x, y]);
      },
      dragMouse(x, y) {
        calls.push(['dragMouse', x, y]);
      },
      scrollMouse(x, y) {
        calls.push(['scrollMouse', x, y]);
      },
      mouseClick(button, doubleClick) {
        calls.push(['mouseClick', button, doubleClick]);
      },
    },
  });

  const moveResponse = await mouseTools.mouseMove({ x: 25, y: 25 });
  const dragResponse = await mouseTools.mouseDrag({ x: 30, y: 30 });
  const scrollResponse = await mouseTools.mouseScroll({ y: -2 });
  const clickResponse = await mouseTools.mouseClick({ button: 'right', double: true });

  assert.equal(moveResponse.isError, false);
  assert.equal(dragResponse.isError, false);
  assert.equal(scrollResponse.isError, false);
  assert.equal(clickResponse.isError, false);
  assert.deepEqual(calls, [
    ['moveMouse', 25, 25],
    ['dragMouse', 30, 30],
    ['scrollMouse', 0, -2],
    ['mouseClick', 'right', true],
  ]);

  const unsafeMouseTools = createMouseTools({
    config: { safeArea: { x: 10, y: 10, width: 10, height: 10 } },
    logger: { error() {} },
    robotAdapter: {
      getScreenSize() {
        return { width: 100, height: 100 };
      },
      getMousePosition() {
        return { x: 30, y: 30 };
      },
      scrollMouse() {
        throw new Error('should not scroll');
      },
      mouseClick() {
        throw new Error('should not click');
      },
    },
  });

  const unsafeScroll = await unsafeMouseTools.mouseScroll({ y: 1 });
  const unsafeClick = await unsafeMouseTools.mouseClick({});

  assert.equal(unsafeScroll.isError, true);
  assert.equal(unsafeClick.isError, true);
  assert.equal(getPayload(unsafeScroll).error.code, 'PERMISSION_DENIED');
  assert.equal(getPayload(unsafeClick).error.code, 'PERMISSION_DENIED');
});

test('keyboard and mouse tools honor input policy flags', async () => {
  const mouseTools = createMouseTools({
    config: { enableInput: false },
    logger: { error() {} },
    robotAdapter: {
      getScreenSize() {
        return { width: 10, height: 10 };
      },
      moveMouse() {},
      mouseClick() {},
    },
  });
  const keyboardTools = createKeyboardTools({
    config: { readOnly: true },
    logger: { error() {} },
    robotAdapter: {
      typeString() {},
      pressKey() {},
    },
  });

  const moveResponse = await mouseTools.mouseMove({ x: 1, y: 1 });
  const typeResponse = await keyboardTools.keyboardType({ text: 'hello' });

  assert.equal(moveResponse.isError, true);
  assert.equal(typeResponse.isError, true);
  assert.equal(getPayload(moveResponse).error.code, 'PERMISSION_DENIED');
  assert.equal(getPayload(typeResponse).error.code, 'PERMISSION_DENIED');
});

test('mouse and keyboard tools return MCP errors on adapter failures', async () => {
  const mouseTools = createMouseTools({
    config: {},
    logger: { error() {} },
    robotAdapter: {
      getScreenSize() {
        return { width: 100, height: 50 };
      },
      moveMouse() {
        throw new Error('mouse unavailable');
      },
      mouseClick() {
        throw new Error('click unavailable');
      },
    },
  });
  const keyboardTools = createKeyboardTools({
    config: {},
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

test('keyboard press normalizes aliases and modifiers', async () => {
  let pressed = null;
  const keyboardTools = createKeyboardTools({
    config: {},
    logger: { error() {} },
    platform: {
      getDesktopCapabilities() {
        return { platform: 'darwin' };
      },
    },
    robotAdapter: {
      pressKey(key, modifiers) {
        pressed = { key, modifiers };
      },
    },
  });

  const response = await keyboardTools.keyboardPress({ key: 'Esc', modifiers: ['primary', 'option', 'cmd'] });

  assert.equal(response.isError, false);
  assert.deepEqual(pressed, { key: 'escape', modifiers: ['command', 'alt'] });
});