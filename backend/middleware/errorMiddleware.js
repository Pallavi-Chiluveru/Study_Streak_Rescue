const errorHandler = (err, req, res, next) => {
  const statusCode = res.statusCode >= 400 ? res.statusCode : 500;
  // Provider errors, database errors and request config can contain credentials.
  console.error('API request failed.');
  res.status(statusCode).json({
    message: statusCode >= 500 ? 'Internal Server Error' : 'Unable to process this request.'
  });
};
module.exports = { errorHandler };
