import type { RedwoodFastifyWebOptions } from '@redwoodjs/fastify-web'

export type ParsedOptions = {
  port?: number
  host?: string
} & RedwoodFastifyWebOptions['redwood']
