const test = require('node:test');
const assert = require('node:assert/strict');

const { createConnectedClient } = require('../helpers/create-client');

test('stdio MCP server exposes tools and returns screen size', async () => {
  const { client, transport } = await createConnectedClient();

  try {
    const tools = await client.listTools();
    const toolNames = tools.tools.map((tool) => tool.name);

    assert.deepEqual(toolNames.sort(), [
      'get_screen_size',
      'keyboard_press',
      'keyboard_type',
      'mouse_click',
      'mouse_move',
      'screen_capture',
    ]);

    const result = await client.callTool({ name: 'get_screen_size', arguments: {} });
    const payload = JSON.parse(result.content[0].text);

    assert.equal(payload.success, true);
    assert.equal(typeof payload.result.width, 'number');
    assert.equal(typeof payload.result.height, 'number');
    assert.ok(payload.result.width > 0);
    assert.ok(payload.result.height > 0);
  } finally {
    await transport.close();
  }
});

test('screen_capture returns MCP error without closing connection on headless Linux', async (t) => {
  if (process.platform !== 'linux') {
    t.skip('Linux-specific headless validation');
    return;
  }

  const { client, transport } = await createConnectedClient({
    env: {
      DISPLAY: '',
      WAYLAND_DISPLAY: '',
    },
  });

  try {
    const result = await client.callTool({ name: 'screen_capture', arguments: {} });
    const payload = JSON.parse(result.content[0].text);

    assert.equal(result.isError, true);
    assert.equal(payload.success, false);
    assert.equal(payload.error.code, 'DISPLAY_UNAVAILABLE');
  } finally {
    await transport.close();
  }
});

test('reading unknown screenshot resource fails gracefully', async () => {
  const { client, transport } = await createConnectedClient();

  try {
    await assert.rejects(client.readResource({ uri: 'screenshot://missing' }), /SCREENSHOT_NOT_FOUND|not found/i);
  } finally {
    await transport.close();
  }
});