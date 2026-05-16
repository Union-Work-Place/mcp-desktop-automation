const test = require('node:test');
const assert = require('node:assert/strict');

const { createConnectedClient } = require('../helpers/create-client');

test('stdio MCP server exposes tools and returns screen size', async () => {
  const { client, transport } = await createConnectedClient();

  try {
    const tools = await client.listTools();
    const toolNames = tools.tools.map((tool) => tool.name);

    assert.deepEqual(toolNames.sort(), [
      'get_desktop_capabilities',
      'get_mouse_position',
      'get_screen_size',
      'get_server_status',
      'keyboard_press',
      'keyboard_type',
      'mouse_click',
      'mouse_drag',
      'mouse_move',
      'mouse_scroll',
      'screen_capture',
      'wait_for_screen_change',
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

test('desktop capabilities tool reports platform metadata', async () => {
  const { client, transport } = await createConnectedClient();

  try {
    const result = await client.callTool({ name: 'get_desktop_capabilities', arguments: {} });
    const payload = JSON.parse(result.content[0].text);

    assert.equal(payload.success, true);
    assert.equal(typeof payload.result.platform, 'string');
    assert.equal(typeof payload.result.mouse.supportsScroll, 'boolean');
    assert.equal(typeof payload.result.keyboard.primaryModifier, 'string');
  } finally {
    await transport.close();
  }
});

test('server status tool reports diagnostics', async () => {
  const { client, transport } = await createConnectedClient();

  try {
    const result = await client.callTool({ name: 'get_server_status', arguments: {} });
    const payload = JSON.parse(result.content[0].text);

    assert.equal(payload.success, true);
    assert.equal(typeof payload.result.nodeVersion, 'string');
    assert.equal(typeof payload.result.screenshotStore.count, 'number');
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

test('screenshot list resource returns metadata JSON without blob payloads', async () => {
  const { client, transport } = await createConnectedClient();

  try {
    const result = await client.readResource({ uri: 'screenshot://list' });
    const payload = JSON.parse(result.contents[0].text);

    assert.ok(Array.isArray(payload.screenshots));
    if (payload.screenshots[0]) {
      assert.equal('data' in payload.screenshots[0], false);
    }
  } finally {
    await transport.close();
  }
});

test('diagnostics resources and prompts are exposed', async () => {
  const { client, transport } = await createConnectedClient();

  try {
    const diagnostics = await client.readResource({ uri: 'diagnostics://status' });
    const capabilities = await client.readResource({ uri: 'diagnostics://capabilities' });
    const recentScreenshot = await client.readResource({ uri: 'screenshot://recent' });
    const prompts = await client.listPrompts();
    const prompt = await client.getPrompt({ name: 'inspect-screen', arguments: { goal: 'find focused window' } });
    const promptWithoutGoal = await client.getPrompt({ name: 'inspect-screen', arguments: {} });
    const clickPrompt = await client.getPrompt({ name: 'click-by-coordinates', arguments: { x: '10', y: '20' } });
    const typePrompt = await client.getPrompt({ name: 'type-text-safely', arguments: { text: 'hello' } });

    assert.equal(typeof JSON.parse(diagnostics.contents[0].text).nodeVersion, 'string');
    assert.equal(typeof JSON.parse(capabilities.contents[0].text).platform, 'string');
    assert.ok('screenshot' in JSON.parse(recentScreenshot.contents[0].text));
    assert.ok(prompts.prompts.some((item) => item.name === 'inspect-screen'));
    assert.ok(prompts.prompts.some((item) => item.name === 'click-by-coordinates'));
    assert.ok(prompts.prompts.some((item) => item.name === 'type-text-safely'));
    assert.match(prompt.messages[0].content.text, /find focused window/i);
    assert.doesNotMatch(promptWithoutGoal.messages[0].content.text, /for:/i);
    assert.match(clickPrompt.messages[0].content.text, /\(10, 20\)/);
    assert.match(typePrompt.messages[0].content.text, /hello/i);
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