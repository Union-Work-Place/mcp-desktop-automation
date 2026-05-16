#!/usr/bin/env node

const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');

const packageJson = require('./package.json');
const { createPlatformAdapter } = require('./src/adapters/platform');
const { createRobotjsAdapter } = require('./src/adapters/robotjsAdapter');
const { createScreenshotAdapter } = require('./src/adapters/screenshotAdapter');
const { createConfig } = require('./src/config');
const { createLogger } = require('./src/logging');
const { createScreenshotStore } = require('./src/domain/screenshots');
const { createServer } = require('./src/server/createServer');

async function main() {
  const config = createConfig(process.env);
  const platform = createPlatformAdapter({ env: process.env, platform: process.platform });
  const runtimeEnvironment = platform.getRuntimeEnvironment();

  Object.entries(runtimeEnvironment).forEach(([key, value]) => {
    if (!process.env[key] && value) {
      process.env[key] = value;
    }
  });

  const logger = createLogger();
  const server = createServer({
    version: packageJson.version,
    config,
    logger,
    platform,
    robotAdapter: createRobotjsAdapter(),
    screenshotAdapter: createScreenshotAdapter(),
    screenshotStore: createScreenshotStore(config),
  });

  logger.info('startup_diagnostics', {
    nodeVersion: process.versions.node,
    platform: platform.getDesktopCapabilities(config),
    runtimeEnvironment,
    config: {
      enableInput: config.enableInput,
      readOnly: config.readOnly,
      dryRun: config.dryRun,
    },
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info('server_connected', { transport: 'stdio' });
}

main().catch((error) => {
  createLogger().error('fatal_error', error);
  process.exit(1);
});
