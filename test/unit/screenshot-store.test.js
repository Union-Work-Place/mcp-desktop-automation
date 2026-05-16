const test = require('node:test');
const assert = require('node:assert/strict');

const { createScreenshotStore } = require('../../src/domain/screenshots');

test('screenshot store keeps metadata, enforces max items, and hides blob data in list', () => {
  let currentTime = 1_700_000_000_000;
  const store = createScreenshotStore({
    now: () => currentTime,
    screenshotTtlMs: 10_000,
    screenshotMaxItems: 2,
    screenshotMaxBytes: 1024,
  });

  const first = store.save('YQ==', { mimeType: 'image/png', width: 10, height: 20 });
  currentTime += 1;
  const second = store.save('Yg==', { mimeType: 'image/png', width: 30, height: 40 });
  currentTime += 1;
  store.save('Yw==', { mimeType: 'image/png', width: 50, height: 60 });

  const listed = store.list();

  assert.equal(store.get(first.id), null);
  assert.ok(store.get(second.id));
  assert.equal(listed.length, 2);
  assert.equal('data' in listed[0], false);
  assert.match(listed[0].id, /^[0-9a-f-]{36}$/i);
  assert.equal(typeof listed[0].byteSize, 'number');
});

test('screenshot store expires old entries', () => {
  let currentTime = 1_700_000_000_000;
  const store = createScreenshotStore({
    now: () => currentTime,
    screenshotTtlMs: 5,
    screenshotMaxItems: 5,
    screenshotMaxBytes: 1024,
  });

  const screenshot = store.save('YQ==', { mimeType: 'image/png' });
  currentTime += 10;

  assert.equal(store.get(screenshot.id), null);
  assert.deepEqual(store.list(), []);
});

test('screenshot store rejects entries larger than configured byte limit', () => {
  const store = createScreenshotStore({
    screenshotTtlMs: 5,
    screenshotMaxItems: 5,
    screenshotMaxBytes: 1,
  });

  assert.throws(() => {
    store.save('YWI=', { mimeType: 'image/png' });
  }, /configured storage byte limit/i);
});

test('screenshot store exposes recent item metadata and stats', () => {
  const store = createScreenshotStore({
    now: () => 1_700_000_000_000,
    screenshotTtlMs: 10_000,
    screenshotMaxItems: 3,
    screenshotMaxBytes: 1024,
  });

  store.save('YQ==', { mimeType: 'image/png', displayId: 'A' });
  const latest = store.save('Yg==', { mimeType: 'image/jpeg', format: 'jpg', displayId: 'B' });
  const recent = store.recent();
  const stats = store.stats();

  assert.equal(recent.id, latest.id);
  assert.equal(recent.mimeType, 'image/jpeg');
  assert.equal(recent.format, 'jpg');
  assert.equal(recent.displayId, 'B');
  assert.deepEqual(stats, {
    count: 2,
    totalBytes: 2,
    maxItems: 3,
    maxBytes: 1024,
    ttlMs: 10_000,
  });
});