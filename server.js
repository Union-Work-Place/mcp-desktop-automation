#!/usr/bin/env node

const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');

const packageJson = require('./package.json');
const { createPlatformAdapter } = require('./src/adapters/platform');
const { createRobotjsAdapter } = require('./src/adapters/robotjsAdapter');
const { createScreenshotAdapter } = require('./src/adapters/screenshotAdapter');
const { createConfig } = require('./src/config');
const { createScreenshotStore } = require('./src/domain/screenshots');
const { createServer } = require('./src/server/createServer');

async function main() {
  const config = createConfig(process.env);
  const server = createServer({
    version: packageJson.version,
    config,
    logger: console,
    platform: createPlatformAdapter({ env: process.env, platform: process.platform }),
    robotAdapter: createRobotjsAdapter(),
    screenshotAdapter: createScreenshotAdapter(),
    screenshotStore: createScreenshotStore(config),
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Robot MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});
