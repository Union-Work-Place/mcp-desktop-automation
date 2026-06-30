#!/usr/bin/env node

'use strict';

const path = require('node:path');

const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');

const { createPlatformAdapter } = require('../src/adapters/platform');

const workspaceRoot = path.resolve(__dirname, '..');

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
        },
        null,
        2,
      ) + '\n',
    );
  } finally {
    await transport.close();
  }
}

main().catch((error) => {
  process.stderr.write(error.message + '\n');
  process.exit(1);
});