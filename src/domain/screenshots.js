const { Buffer } = require('node:buffer');
const { randomUUID } = require('node:crypto');

const { AutomationError, ErrorCodes } = require('./errors');

function toMetadata(record) {
  return {
    id: record.id,
    mimeType: record.mimeType,
    createdAt: record.createdAt,
    expiresAt: record.expiresAt,
    byteSize: record.byteSize,
    width: record.width,
    height: record.height,
    format: record.format,
    displayId: record.displayId,
  };
}

function createScreenshotStore(options = {}) {
  const screenshots = new Map();
  const now = options.now || Date.now;
  const ttlMs = options.screenshotTtlMs || 5 * 60 * 1000;
  const maxItems = options.screenshotMaxItems || 20;
  const maxBytes = options.screenshotMaxBytes || 10 * 1024 * 1024;
  let totalBytes = 0;

  function remove(id) {
    const record = screenshots.get(id);
    if (!record) {
      return;
    }

    totalBytes -= record.byteSize;
    screenshots.delete(id);
  }

  function purgeExpired() {
    const currentTime = now();
    for (const [id, record] of screenshots.entries()) {
      if (record.expiresAtTimestamp <= currentTime) {
        remove(id);
      }
    }
  }

  function enforceLimits() {
    while (screenshots.size > maxItems || totalBytes > maxBytes) {
      const oldestId = screenshots.keys().next().value;
      if (!oldestId) {
        break;
      }

      remove(oldestId);
    }
  }

  return {
    save(base64Data, metadata = {}) {
      purgeExpired();

      const createdAtTimestamp = now();
      const byteSize = Buffer.byteLength(base64Data, 'base64');

      if (byteSize > maxBytes) {
        throw new AutomationError(
          ErrorCodes.SCREENSHOT_FAILED,
          'Screenshot exceeds the configured storage byte limit.',
          { byteSize, maxBytes },
        );
      }

      const record = {
        id: randomUUID(),
        data: base64Data,
        mimeType: metadata.mimeType || 'image/png',
        createdAt: new Date(createdAtTimestamp).toISOString(),
        expiresAt: new Date(createdAtTimestamp + ttlMs).toISOString(),
        expiresAtTimestamp: createdAtTimestamp + ttlMs,
        byteSize,
        width: metadata.width ?? null,
        height: metadata.height ?? null,
        format: metadata.format || 'png',
        displayId: metadata.displayId ?? null,
      };

      screenshots.set(record.id, record);
      totalBytes += record.byteSize;
      enforceLimits();

      const savedRecord = screenshots.get(record.id);
      if (!savedRecord) {
        throw new AutomationError(
          ErrorCodes.SCREENSHOT_FAILED,
          'Screenshot could not be stored within configured limits.',
          { byteSize, maxBytes, maxItems },
        );
      }

      return savedRecord;
    },
    get(id) {
      purgeExpired();
      return screenshots.get(id) || null;
    },
    list() {
      purgeExpired();
      return Array.from(screenshots.values(), toMetadata).reverse();
    },
  };
}

module.exports = {
  createScreenshotStore,
};