function textResponse(payload, isError) {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(payload),
      },
    ],
    isError: Boolean(isError),
  };
}

function okResponse(payload) {
  return textResponse(Object.assign({ success: true }, payload || {}), false);
}

function errorResponse(code, message, details) {
  const error = { code, message };

  if (details !== undefined) {
    error.details = details;
  }

  return textResponse({ success: false, error }, true);
}

function imageResponse(payload, image) {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(Object.assign({ success: true }, payload || {})),
      },
      {
        type: 'image',
        mimeType: image.mimeType,
        data: image.data,
      },
    ],
    isError: false,
  };
}

module.exports = {
  errorResponse,
  imageResponse,
  okResponse,
};