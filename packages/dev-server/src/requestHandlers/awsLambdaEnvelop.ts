import type { APIGatewayProxyResult, APIGatewayProxyEvent } from 'aws-lambda'
import type { Response, Request } from 'express'
import qs from 'qs'

import { handleError } from '../error'

export const parseBody = (rawBody: string | Buffer) => {
  if (typeof rawBody === 'string') {
    return { body: rawBody, isBase64Encoded: false }
  }
  if (rawBody instanceof Buffer) {
    return { body: rawBody.toString('base64'), isBase64Encoded: true }
  }
  return { body: '', isBase64Encoded: false }
}

const lambdaEventForExpressRequest = (
  request: Request
): APIGatewayProxyEvent => {
  return {
    httpMethod: request.method,
    headers: request.headers,
    path: request.path,
    queryStringParameters: qs.parse(request.url.split(/\?(.+)/)[1]),
    requestContext: {
      identity: {
        sourceIp: request.ip,
      },
    },
    ...parseBody(request.body), // adds `body` and `isBase64Encoded`
  } as APIGatewayProxyEvent
}

const expressResponseForLambdaResult = (
  expressResFn: Response,
  lambdaResult: APIGatewayProxyResult
) => {
  const { statusCode = 200, headers, body = '' } = lambdaResult

  if (headers) {
    Object.keys(headers).forEach((headerName) => {
      const headerValue: any = headers[headerName]
      expressResFn.setHeader(headerName, headerValue)
    })
  }

  expressResFn.status(statusCode)

  // We're using this to log GraphQL errors, this isn't the right place.
  // I can't seem to get the express middleware to play nicely.
  if (statusCode === 400) {
    try {
      const b = JSON.parse(body)
      if (b?.errors?.[0]) {
        const { message } = b.errors[0]
        const e = new Error(message)
        e.stack = ''
        handleError(e).then(console.log)
      }
    } catch (e) {
      // do nothing
    }
  }

  // The AWS lambda docs specify that the response object must be
  // compatible with `JSON.stringify`, but the type definition specifies that
  // it must be a string.
  if (typeof body === 'string') {
    expressResFn.send(body)
  } else {
    expressResFn.json(body)
  }
}

const expressResponseForLambdaError = (
  expressResFn: Response,
  error: Error
) => {
  handleError(error).then(console.log)
  expressResFn.status(500).send()
}

export const requestHandlerEnvelop = async (
  req: Request,
  res: Response,
  lambdaFunction: any
) => {
  const { routeName } = req.params
  const { handler } = lambdaFunction

  // TODO: Move this to http.
  if (typeof handler !== 'function') {
    const errorMessage = `"${routeName}" does not export a function named "handler"`
    console.error(errorMessage)
    res.status(500).send(escape(errorMessage))
  }

  // We take the express request object and convert it into a lambda function event.
  const event = lambdaEventForExpressRequest(req)

  console.log(JSON.stringify(event, null, 2))

  // Execute the lambda function.
  // https://docs.aws.amazon.com/lambda/latest/dg/nodejs-prog-model-handler.html
  try {
    const handlerResult = await handler(
      event,
      {} as any // TODO: Add support for context: https://github.com/DefinitelyTyped/DefinitelyTyped/blob/0bb210867d16170c4a08d9ce5d132817651a0f80/types/aws-lambda/index.d.ts#L443-L467
    )
    expressResponseForLambdaResult(res, handlerResult)
  } catch (e) {
    expressResponseForLambdaError(res, e)
  }
}
