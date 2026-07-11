import chalk from 'chalk'

import { coerceRootPath } from '@redwoodjs/fastify-web'

import { getAPIPort, getAPIHost } from './cliHelpers'
import { createServer } from './createServer'
import type { APIParsedOptions } from './types'

export async function handler(options: APIParsedOptions = {}) {
  const timeStart = Date.now()
  console.log(chalk.dim.italic('Starting API Server...'))

  options.apiRootPath = coerceRootPath(options.apiRootPath ?? '/')

  const fastify = await createServer({
    apiRootPath: options.apiRootPath,
  })

  options.host ??= getAPIHost()
  options.port ??= getAPIPort()

  await fastify.start()

  fastify.log.trace(
    { custom: { ...fastify.initialConfig } },
    'Fastify server configuration',
  )
  fastify.log.trace(`Registered plugins\n${fastify.printPlugins()}`)

  console.log(chalk.dim.italic('Took ' + (Date.now() - timeStart) + ' ms'))

  // We have this logic for `apiServerHandler` because this is the only
  // handler called by the watch bin (which is called by `yarn rw dev`).
  let address = fastify.listeningOrigin
  if (process.env.NODE_ENV !== 'production') {
    address = address.replace(/http:\/\/\[::\]/, 'http://localhost')
  }

  const apiServer = chalk.magenta(`${address}${options.apiRootPath}`)
  const graphqlEndpoint = chalk.magenta(`${apiServer}graphql`)

  console.log(`API server listening at ${apiServer}`)
  console.log(`GraphQL endpoint at ${graphqlEndpoint}`)

  process?.send?.('ready')
}
