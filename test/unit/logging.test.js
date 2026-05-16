const test = require('node:test');
const assert = require('node:assert/strict');

const { createLogger } = require('../../src/logging');

test('structured logger omits blob-like payloads and keeps error metadata', () => {
  const lines = [];
  const logger = createLogger({
    sink: {
      write(line) {
        lines.push(JSON.parse(line));
      },
    },
  });

  const error = new Error('boom');
  error.code = 'TEST';
  error.details = { blob: 'abc', nested: { data: 'xyz' } };

  logger.error('example', error);

  assert.equal(lines[0].level, 'error');
  assert.equal(lines[0].meta.code, 'TEST');
  assert.equal(lines[0].meta.details.blob, '[omitted]');
  assert.equal(lines[0].meta.details.nested.data, '[omitted]');
});