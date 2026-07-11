import type { FastifyInstance } from 'fastify'

import type { RedwoodFastifyAPIOptions } from './plugins/api'

// Types for using server.config.js
export type FastifySideConfigFnOptions = {
  side: 'api' | 'web'
}

export type FastifySideConfigFn = (
  fastify: FastifyInstance,
  options?: FastifySideConfigFnOptions &
    Pick<RedwoodFastifyAPIOptions['redwood'], 'apiRootPath'>,
) => Promise<FastifyInstance> | void

export type APIParsedOptions = {
  port?: number
  host?: string
  loadEnvFiles?: boolean
} & Omit<RedwoodFastifyAPIOptions['redwood'], 'fastGlobOptions'>

export type BothParsedOptions = {
  webPort?: number
  webHost?: string
  apiPort?: number
  apiHost?: string
  apiRootPath?: string
} & Omit<RedwoodFastifyAPIOptions['redwood'], 'fastGlobOptions'>
