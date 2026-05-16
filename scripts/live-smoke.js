#!/usr/bin/env node

'use strict';

const { spawn, spawnSync } = require('node:child_process');
const path = require('node:path');
const { setTimeout: delay } = require('node:timers/promises');

const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');

const { createPlatformAdapter } = require('../src/adapters/platform');

const workspaceRoot = path.resolve(__dirname, '..');

function ensureLinuxWindowCommand(env) {
  const commandCheck = spawnSync('sh', ['-lc', 'command -v xterm'], {
    env,
    encoding: 'utf8',
  });

  if (commandCheck.status !== 0) {
    throw new Error('xterm is required for npm run test:live-smoke on Linux.');
  }
}

function parsePayload(result, toolName) {
  const payload = JSON.parse(result.content[0].text);

  if (result.isError || payload.success === false) {
    throw new Error(`${toolName} failed: ${result.content[0].text}`);
  }

  return payload;
}

async function main() {
  const platform = createPlatformAdapter({ env: process.env, platform: process.platform });
  const runtimeEnvironment = platform.getRuntimeEnvironment();
  const env = Object.assign({}, process.env, runtimeEnvironment);
  const client = new Client({ name: 'mcp-desktop-automation-live-smoke', version: '1.0.0' }, { capabilities: {} });
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [path.join(workspaceRoot, 'launch.js')],
    cwd: workspaceRoot,
    env,
    stderr: 'pipe',
  });
  let smokeWindow = null;

  try {
    await client.connect(transport);

    const status = parsePayload(await client.callTool({ name: 'get_server_status', arguments: {} }), 'get_server_status');
    const capabilities = parsePayload(
      await client.callTool({ name: 'get_desktop_capabilities', arguments: {} }),
      'get_desktop_capabilities',
    );

    if (!capabilities.result.screenCaptureAvailable) {
      throw new Error(`Screen capture is not available: ${JSON.stringify(capabilities.result)}`);
    }

    const capture = parsePayload(
      await client.callTool({ name: 'screen_capture', arguments: { includeImage: false, format: 'png' } }),
      'screen_capture',
    );

    let waitForScreenChange = null;
    if (process.platform === 'linux') {
      ensureLinuxWindowCommand(env);
      waitForScreenChange = client.callTool({
        name: 'wait_for_screen_change',
        arguments: { includeImage: false, format: 'png', timeoutMs: 10000, pollIntervalMs: 250 },
      });

      await delay(1500);
      smokeWindow = spawn('xterm', ['-geometry', '80x24+100+80', '-title', 'MCP-Live-Smoke'], {
        env,
        stdio: 'ignore',
      });

      await delay(1000);
      spawn('xdg-open', ['/tmp'], {
        env,
        stdio: 'ignore',
      });
    }

    const waitPayload = waitForScreenChange
      ? parsePayload(await waitForScreenChange, 'wait_for_screen_change')
      : null;

    process.stdout.write(
      JSON.stringify(
        {
          status: 'ok',
          runtimeEnvironment,
          diagnostics: {
            nodeVersion: status.result.nodeVersion,
            displayServer: capabilities.result.displayServer,
            screenCaptureAvailable: capabilities.result.screenCaptureAvailable,
          },
          capture: {
            screenshotId: capture.screenshotId,
            resourceUri: capture.resourceUri,
          },
          waitForScreenChange: waitPayload
            ? {
                screenshotId: waitPayload.screenshotId,
                resourceUri: waitPayload.resourceUri,
              }
            : 'skipped',
        },
        null,
        2,
      ) + '\n',
    );
  } finally {
    if (smokeWindow && smokeWindow.pid) {
      smokeWindow.kill('SIGTERM');
    }

    await transport.close();
  }
}

main().catch((error) => {
  process.stderr.write(error.message + '\n');
  process.exit(1);
});