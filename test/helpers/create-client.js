const path = require('node:path');

const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');

const workspaceRoot = path.resolve(__dirname, '..', '..');

async function createConnectedClient(options = {}) {
  const client = new Client({ name: 'mcp-desktop-automation-test', version: '1.0.0' }, { capabilities: {} });
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [path.join(workspaceRoot, 'launch.js')],
    cwd: workspaceRoot,
    env: Object.assign({}, process.env, options.env),
    stderr: 'pipe',
  });

  await client.connect(transport);

  return { client, transport };
}

module.exports = {
  createConnectedClient,
  workspaceRoot,
};
