/**
 * @typedef { import('aws-lambda').APIGatewayEvent } APIGatewayEvent
 * @typedef { import('aws-lambda').Context } Context
 * @param { APIGatewayEvent } event
 * @param { Context } context
 */
const handler = async (event, _context) => {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      data: process.env.LOAD_ENV_DEFAULTS_TEST,
    }),
  }
}

module.exports = { handler }
