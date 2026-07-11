type ParseBodyResult = {
  body: string
  isBase64Encoded: boolean
}

type FastifyHeaderValue = string | number | boolean

type FastifyMergedHeaders = { [name: string]: FastifyHeaderValue[] }

type FastifyRequestHeader = { [header: string]: FastifyHeaderValue }

type FastifyLambdaHeaders = FastifyRequestHeader | undefined

type FastifyLambdaMultiValueHeaders = FastifyMergedHeaders | undefined

export const parseBody = (rawBody: string | Buffer): ParseBodyResult => {
  if (typeof rawBody === 'string') {
    return { body: rawBody, isBase64Encoded: false }
  }
  if (rawBody instanceof Buffer) {
    return { body: rawBody.toString('base64'), isBase64Encoded: true }
  }
  return { body: '', isBase64Encoded: false }
}

/**
 * `headers` and `multiValueHeaders` are merged into a single object where the
 * key is the header name in lower-case and the value is a list of values for
 * that header. Most multi-values are merged into a single value separated by a
 * semi-colon. The only exception is set-cookie. set-cookie headers should not
 * be merged, they should be set individually by multiple calls to
 * reply.header(). See
 * https://www.fastify.io/docs/latest/Reference/Reply/#set-cookie
 */
export const mergeMultiValueHeaders = (
  headers: FastifyLambdaHeaders,
  multiValueHeaders: FastifyLambdaMultiValueHeaders,
) => {
  const mergedHeaders = Object.entries(
    headers || {},
  ).reduce<FastifyMergedHeaders>((acc, [name, value]) => {
    acc[name.toLowerCase()] = [value]

    return acc
  }, {})

  Object.entries(multiValueHeaders || {}).forEach(([headerName, values]) => {
    const name = headerName.toLowerCase()

    if (name.toLowerCase() === 'set-cookie') {
      mergedHeaders['set-cookie'] = values
    } else {
      mergedHeaders[name] = [values.join('; ')]
    }
  })

  return mergedHeaders
}
