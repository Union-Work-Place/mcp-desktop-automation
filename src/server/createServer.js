const { McpServer, ResourceTemplate } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { z } = require('zod');

const { AutomationError, ErrorCodes } = require('../domain/errors');
const { createKeyboardTools } = require('../tools/keyboard');
const { createMouseTools } = require('../tools/mouse');
const { createScreenTools } = require('../tools/screen');

function createServer(dependencies) {
  const logger = dependencies.logger || console;
  const server = new McpServer(
    {
      name: 'mcp-desktop-automation',
      version: dependencies.version,
    },
    {
      capabilities: {
        resources: {},
        tools: {},
        logging: {},
      },
    },
  );

  const toolDependencies = Object.assign({}, dependencies, {
    notifyResourcesChanged: async () => {
      await server.server.sendResourceListChanged();
    },
  });

  const keyboardTools = createKeyboardTools(toolDependencies);
  const mouseTools = createMouseTools(toolDependencies);
  const screenTools = createScreenTools(toolDependencies);

  server.tool(
    'get_desktop_capabilities',
    'Reports desktop automation capabilities and current platform policy settings',
    {},
    async () => screenTools.getDesktopCapabilities(),
  );

  server.tool('get_screen_size', 'Gets the screen dimensions', {}, async () => screenTools.getScreenSize());

  server.tool(
    'screen_capture',
    'Captures the current screen content',
    {
      includeImage: z.boolean().optional().describe('Whether to embed the image inline in the response'),
      format: z.enum(['png', 'jpg', 'jpeg']).default('png').describe('Requested image format'),
      displayId: z.union([z.string(), z.number()]).optional().describe('Optional display identifier'),
    },
    async (params) => screenTools.screenCapture(params),
  );

  server.tool(
    'keyboard_press',
    'Presses a keyboard key or key combination',
    {
      key: z.string().describe("Key to press (e.g., 'enter', 'a', 'control')"),
      modifiers: z
        .array(z.enum(['control', 'shift', 'alt', 'command']))
        .default([])
        .describe('Modifier keys to hold while pressing the key'),
    },
    async (params) => keyboardTools.keyboardPress(params),
  );

  server.tool(
    'keyboard_type',
    'Types text at the current cursor position',
    {
      text: z.string().describe('Text to type'),
    },
    async (params) => keyboardTools.keyboardType(params),
  );

  server.tool(
    'mouse_click',
    'Performs a mouse click',
    {
      button: z.enum(['left', 'right', 'middle']).default('left').describe('Mouse button to click'),
      double: z.boolean().default(false).describe('Whether to perform a double click'),
    },
    async (params) => mouseTools.mouseClick(params),
  );

  server.tool(
    'mouse_move',
    'Moves the mouse to specified coordinates',
    {
      x: z.number().describe('X coordinate'),
      y: z.number().describe('Y coordinate'),
    },
    async (params) => mouseTools.mouseMove(params),
  );

  server.tool(
    'mouse_drag',
    'Drags the mouse to specified coordinates',
    {
      x: z.number().describe('X coordinate'),
      y: z.number().describe('Y coordinate'),
    },
    async (params) => mouseTools.mouseDrag(params),
  );

  server.tool('get_mouse_position', 'Gets the current mouse position', {}, async () => mouseTools.getMousePosition());

  server.tool(
    'mouse_scroll',
    'Scrolls the mouse wheel by the specified deltas',
    {
      x: z.number().default(0).describe('Horizontal scroll delta'),
      y: z.number().default(0).describe('Vertical scroll delta'),
    },
    async (params) => mouseTools.mouseScroll(params),
  );

  server.resource('screenshot-list', 'screenshot://list', async () => {
    const screenshots = dependencies.screenshotStore.list();
    logger.info('Returning screenshot list:', screenshots.length);

    return {
      contents: [
        {
          uri: 'screenshot://list',
          mimeType: 'application/json',
          text: JSON.stringify({ screenshots }),
        },
      ],
    };
  });

  server.resource(
    'screenshot-content',
    new ResourceTemplate('screenshot://{id}', { list: undefined }),
    async (uri, { id }) => {
      const screenshot = dependencies.screenshotStore.get(id);
      if (!screenshot) {
        throw new AutomationError(ErrorCodes.SCREENSHOT_NOT_FOUND, `Screenshot ${id} not found.`);
      }

      return {
        contents: [
          {
            uri: uri.href,
            mimeType: screenshot.mimeType,
            blob: screenshot.data,
          },
        ],
      };
    },
  );

  return server;
}

module.exports = {
  createServer,
};