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