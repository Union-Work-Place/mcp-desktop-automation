const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

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