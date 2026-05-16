function sanitizeValue(value) {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      code: value.code,
      details: sanitizeValue(value.details),
    };
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  if (value && typeof value === 'object') {
    return Object.entries(value).reduce((result, entry) => {
      var key = entry[0];
      var child = entry[1];

      if (key === 'data' || key === 'blob') {
        result[key] = '[omitted]';
        return result;
      }

      result[key] = sanitizeValue(child);
      return result;
    }, {});
  }

  if (typeof value === 'string' && value.length > 512) {
    return value.slice(0, 512) + '...[truncated]';
  }

  return value;
}

function createLogger(options = {}) {
  const sink = options.sink || process.stderr;

  function write(level, message, meta) {
    sink.write(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level,
        message,
        meta: sanitizeValue(meta),
      }) + '\n',
    );
  }

  return {
    info(message, meta) {
      write('info', message, meta);
    },
    warn(message, meta) {
      write('warn', message, meta);
    },
    error(message, meta) {
      write('error', message, meta);
    },
  };
}

module.exports = {
  createLogger,
};