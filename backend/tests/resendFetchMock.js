const installResendFetchMock = ({ messages, shouldFail = () => false } = {}) => {
  const originalFetch = global.fetch;
  let requests = 0;

  global.fetch = async (url, options = {}) => {
    if (String(url) !== 'https://api.resend.com/emails') {
      throw new Error('Unexpected external request in test');
    }

    requests += 1;
    const message = JSON.parse(options.body);
    messages.push(message);

    if (shouldFail()) {
      return new Response(JSON.stringify({
        name: 'validation_error',
        message: 'synthetic provider rejection',
        statusCode: 422
      }), {
        status: 422,
        headers: { 'content-type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ id: `email_${requests}` }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
  };

  return () => {
    global.fetch = originalFetch;
  };
};

module.exports = { installResendFetchMock };
