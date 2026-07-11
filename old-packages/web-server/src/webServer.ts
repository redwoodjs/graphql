import path from 'path'

import chalk from 'chalk'
import Fastify from 'fastify'
import fs from 'fs-extra'

import { redwoodFastifyWeb } from '@redwoodjs/fastify-web'
import { getConfig, getPaths } from '@redwoodjs/project-config'

import type { ParsedOptions } from './types'

export async function serveWeb(options: ParsedOptions = {}) {
  const start = Date.now()
  console.log(chalk.dim.italic('Starting Web Server...'))

  const distIndexExists = await fs.pathExists(
    path.join(getPaths().web.dist, 'index.html'),
  )
  if (!distIndexExists) {
    throw new Error(
      'no built files to serve; run `yarn rw build web` before serving the web side',
    )
  }

  if (process.env.REDWOOD_WEB_PORT) {
    options.port ??= parseInt(process.env.REDWOOD_WEB_PORT)
  }
  options.port ??= getConfig().web.port

  options.host ??= process.env.REDWOOD_WEB_HOST
  options.host ??= getConfig().web.host
  options.host ??= process.env.NODE_ENV === 'production' ? '0.0.0.0' : '::'

  if (process.env.NODE_ENV === 'production' && options.host !== '0.0.0.0') {
    console.warn(
      `Warning: host '${options.host}' may need to be '0.0.0.0' in production for containerized deployments`,
    )
  }

  const fastify = Fastify({
    requestTimeout: 15_000,
    logger: {
      level:
        process.env.LOG_LEVEL ??
        (process.env.NODE_ENV === 'development' ? 'debug' : 'warn'),
    },
  })

  fastify.register(redwoodFastifyWeb, { redwood: options })

  const address = await fastify.listen({
    port: options.port,
    host: options.host,
  })

  console.log(chalk.dim.italic('Took ' + (Date.now() - start) + ' ms'))
  console.log(`Web server listening at ${chalk.green(address)}`)
}
