const test = require('node:test');
const assert = require('node:assert/strict');
const { Buffer } = require('node:buffer');

const { createPlatformAdapter } = require('../../src/adapters/platform');
const { createRobotjsAdapter } = require('../../src/adapters/robotjsAdapter');
const { createScreenshotAdapter } = require('../../src/adapters/screenshotAdapter');
const { assertCoordinatesInBounds, assertPointInSafeArea, assertToolAllowed } = require('../../src/domain/policy');
const { errorResponse, imageResponse, okResponse } = require('../../src/server/mcpResponses');

test('MCP response helpers return expected payload shapes', () => {
  const ok = okResponse({ result: 1 });
  const error = errorResponse('TEST_ERROR', 'failed', { reason: 'x' });
  const image = imageResponse({ screenshotId: '1' }, { mimeType: 'image/png', data: 'abc' });

  assert.equal(JSON.parse(ok.content[0].text).success, true);
  assert.equal(JSON.parse(error.content[0].text).error.code, 'TEST_ERROR');
  assert.equal(image.content[1].type, 'image');
});

test('policy helpers enforce tool allowlist, bounds and safe area', () => {
  assert.throws(() => {
    assertToolAllowed('mouse_move', { enableInput: false }, { requiresInput: true });
  }, /disabled by configuration/i);

  assert.throws(() => {
    assertToolAllowed('screen_capture', { allowedTools: ['get_screen_size'] });
  }, /not allowed/i);

  assert.throws(() => {
    assertCoordinatesInBounds({ x: -1, y: 2 }, { width: 100, height: 100 });
  }, /outside of the screen bounds/i);

  assert.throws(() => {
    assertPointInSafeArea({ x: 99, y: 99 }, { x: 0, y: 0, width: 50, height: 50 });
  }, /outside of the configured safe area/i);
});

test('platform adapter reports platform-specific capabilities', () => {
  const linuxPlatform = createPlatformAdapter({
    platform: 'linux',
    env: { MCP_DESKTOP_AUTOMATION_AUTO_DETECT_DISPLAY: 'false' },
    readdirSync() {
      return ['X0'];
    },
  });
  const macPlatform = createPlatformAdapter({ platform: 'darwin', env: {} });

  assert.equal(linuxPlatform.getDesktopCapabilities({ readOnly: true }).displayServer, 'headless');
  assert.equal(macPlatform.getDesktopCapabilities({}).keyboard.primaryModifier, 'command');
});

test('platform adapter auto-detects X11 socket displays on Linux', () => {
  const linuxPlatform = createPlatformAdapter({
    platform: 'linux',
    env: {},
    readdirSync() {
      return ['X3', 'X0', 'not-a-display'];
    },
  });

  assert.equal(linuxPlatform.getDesktopCapabilities({}).displayServer, 'x11');
  assert.equal(linuxPlatform.getScreenCaptureAvailability().available, true);
  assert.deepEqual(linuxPlatform.getRuntimeEnvironment(), { DISPLAY: ':0' });
});

test('screenshot adapter passes mapped options to implementation', async () => {
  let received = null;
  const adapter = createScreenshotAdapter(async (options) => {
    received = options;
    return Buffer.from('ok');
  });

  const result = await adapter.capture({ displayId: 2, format: 'jpg' });

  assert.ok(Buffer.isBuffer(result));
  assert.deepEqual(received, { screen: 2, format: 'jpg' });
});

test('robotjs adapter delegates calls to provided implementation', () => {
  const calls = [];
  const adapter = createRobotjsAdapter({
    getScreenSize() {
      calls.push(['getScreenSize']);
      return { width: 1, height: 2 };
    },
    getMousePos() {
      calls.push(['getMousePos']);
      return { x: 3, y: 4 };
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
    typeString(text) {
      calls.push(['typeString', text]);
    },
    keyTap(key, modifiers) {
      calls.push(['keyTap', key, modifiers]);
    },
    keyToggle(key, action, modifiers) {
      calls.push(['keyToggle', key, action, modifiers]);
    },
  });

  assert.deepEqual(adapter.getScreenSize(), { width: 1, height: 2 });
  assert.deepEqual(adapter.getMousePosition(), { x: 3, y: 4 });
  adapter.moveMouse(1, 2);
  adapter.dragMouse(3, 4);
  adapter.scrollMouse(0, -1);
  adapter.mouseClick('left', true);
  adapter.typeString('hello');
  adapter.pressKey('a', ['control']);
  adapter.toggleKey('shift', 'down', ['control']);

  assert.deepEqual(calls, [
    ['getScreenSize'],
    ['getMousePos'],
    ['moveMouse', 1, 2],
    ['dragMouse', 3, 4],
    ['scrollMouse', 0, -1],
    ['mouseClick', 'left', true],
    ['typeString', 'hello'],
    ['keyTap', 'a', ['control']],
    ['keyToggle', 'shift', 'down', ['control']],
  ]);
});
