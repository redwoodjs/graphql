import type { FastifyRequest, FastifyReply } from 'fastify'

import type { FluidHandler } from '@redwoodjs/api/fluid'

export const fluidRequestHandler = async (
  req: FastifyRequest,
  reply: FastifyReply,
  handler: FluidHandler,
) => {
  const protocol = req.protocol
  const host = req.headers.host || 'localhost'
  const url = `${protocol}://${host}${req.url}`

  const headers = new Headers()
  for (const [key, value] of Object.entries(req.headers)) {
    if (value !== undefined) {
      if (Array.isArray(value)) {
        for (const v of value) {
          headers.append(key, v)
        }
      } else {
        headers.set(key, value)
      }
    }
  }

  const request = new Request(url, {
    method: req.method,
    headers,
    body:
      req.method !== 'GET' && req.method !== 'HEAD' ? req.rawBody : undefined,
  })

  const fluidContext = {
    requestId: req.id,
  }

  try {
    const response = await handler(request, fluidContext)

    reply.status(response.status)

    response.headers.forEach((value: string, key: string) => {
      reply.header(key, value)
    })

    const body = await response.text()
    return reply.send(body)
  } catch (error: any) {
    req.log.error(error)
    reply.status(500).send()
  }
}
