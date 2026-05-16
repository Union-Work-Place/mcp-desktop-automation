function createScreenshotStore() {
  const screenshots = new Map();
  let sequence = 0;

  return {
    save(base64Data) {
      sequence += 1;

      const record = {
        id: `screenshot-${Date.now()}-${sequence}`,
        data: base64Data,
        mimeType: 'image/png',
        createdAt: new Date().toISOString(),
      };

      screenshots.set(record.id, record);
      return record;
    },
    get(id) {
      return screenshots.get(id) || null;
    },
    list() {
      return Array.from(screenshots.values());
    },
  };
}

module.exports = {
  createScreenshotStore,
};