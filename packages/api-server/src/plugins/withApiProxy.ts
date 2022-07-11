import httpProxy, { FastifyHttpProxyOptions } from '@fastify/http-proxy'
import { FastifyInstance } from 'fastify'

import { loadFastifyConfig } from '../fastify'
export interface ApiProxyOptions {
  apiUrl: string
  apiHost: string
}

const withApiProxy = async (
  fastify: FastifyInstance,
  { apiUrl, apiHost }: ApiProxyOptions
) => {
  const proxyOpts: FastifyHttpProxyOptions = {
    upstream: apiHost,
    prefix: apiUrl,
    disableCache: true,
  }

  fastify.register(httpProxy, proxyOpts)

  const { configureFastifyForSide } = loadFastifyConfig()
  fastify = await configureFastifyForSide(fastify, {
    side: 'proxy',
    apiUrl,
    apiHost,
  })

  return fastify
}

export default withApiProxy
