const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { createConfig } = require('../../src/config');
const { workspaceRoot } = require('../helpers/create-client');

test('workspace mcp.json is valid and points to launch.js', () => {
  const configPath = path.join(workspaceRoot, '.vscode', 'mcp.json');
  const rawConfig = fs.readFileSync(configPath, 'utf8');
  const config = JSON.parse(rawConfig);

  assert.ok(config.servers);
  assert.ok(config.servers.desktopAutomation);
  assert.equal(config.servers.desktopAutomation.type, 'stdio');
  assert.equal(config.servers.desktopAutomation.command, 'node');
  assert.deepEqual(config.servers.desktopAutomation.args, ['${workspaceFolder}/launch.js']);
});

test('config parses policy and screenshot settings from env', () => {
  const config = createConfig({
    MCP_DESKTOP_AUTOMATION_ENABLE_INPUT: 'false',
    MCP_DESKTOP_AUTOMATION_READ_ONLY: 'true',
    MCP_DESKTOP_AUTOMATION_DRY_RUN: '1',
    MCP_DESKTOP_AUTOMATION_ALLOWED_TOOLS: 'get_screen_size, screen_capture',
    MCP_DESKTOP_AUTOMATION_BLOCKED_TOOLS: 'mouse_click',
    MCP_DESKTOP_AUTOMATION_SAFE_AREA: '10,20,300,400',
    MCP_DESKTOP_AUTOMATION_SCREEN_CAPTURE_TIMEOUT_MS: '2500',
    MCP_DESKTOP_AUTOMATION_SCREEN_CAPTURE_INLINE_BY_DEFAULT: 'true',
    MCP_DESKTOP_AUTOMATION_SCREEN_CAPTURE_MAX_INLINE_BYTES: '4096',
    MCP_DESKTOP_AUTOMATION_SCREENSHOT_TTL_MS: '9000',
    MCP_DESKTOP_AUTOMATION_SCREENSHOT_MAX_ITEMS: '3',
    MCP_DESKTOP_AUTOMATION_SCREENSHOT_MAX_BYTES: '8192',
  });

  assert.equal(config.enableInput, false);
  assert.equal(config.readOnly, true);
  assert.equal(config.dryRun, true);
  assert.deepEqual(config.allowedTools, ['get_screen_size', 'screen_capture']);
  assert.deepEqual(config.blockedTools, ['mouse_click']);
  assert.deepEqual(config.safeArea, { x: 10, y: 20, width: 300, height: 400 });
  assert.equal(config.screenCaptureTimeoutMs, 2500);
  assert.equal(config.screenCaptureInlineByDefault, true);
  assert.equal(config.screenCaptureMaxInlineBytes, 4096);
  assert.equal(config.screenshotTtlMs, 9000);
  assert.equal(config.screenshotMaxItems, 3);
  assert.equal(config.screenshotMaxBytes, 8192);
});