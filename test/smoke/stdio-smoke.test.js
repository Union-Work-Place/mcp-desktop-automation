const test = require('node:test');
const assert = require('node:assert/strict');

const { createConnectedClient } = require('../helpers/create-client');

test('launcher starts stdio server and closes cleanly', async () => {
  const { client, transport } = await createConnectedClient();

  try {
    const tools = await client.listTools();
    assert.ok(tools.tools.length > 0);
  } finally {
    await transport.close();
  }
});