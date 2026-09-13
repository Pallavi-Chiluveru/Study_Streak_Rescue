const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || err.status || (res.statusCode >= 400 ? res.statusCode : 500);
  // Log bounded diagnostic metadata without request data, credentials, or database values.
  console.error('API request failed.', {
    method: req.method,
    path: req.originalUrl,
    statusCode,
    errorName: err.name || 'Error',
    errorCode: typeof err.code === 'string' || typeof err.code === 'number' ? err.code : undefined
  });
  res.status(statusCode).json({
    message: statusCode >= 500 ? 'Internal Server Error' : 'Unable to process this request.'
  });
};
module.exports = { errorHandler };
