/**
 * @typedef { import('aws-lambda').APIGatewayEvent } APIGatewayEvent
 * @typedef { import('aws-lambda').Context } Context
 * @param { APIGatewayEvent } event
 * @param { Context } context
 */
const handler = async (event, _context) => {
  const { query } = event.queryStringParameters

  if (query.trim() !== "{redwood{version}}") {
    return {
      statusCode: 400
    }
  }

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      data: {
        version: 42
      },
    }),
  }
}

module.exports = { handler }
