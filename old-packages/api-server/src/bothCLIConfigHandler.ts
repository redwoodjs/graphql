import chalk from 'chalk'

import { redwoodFastifyWeb, coerceRootPath } from '@redwoodjs/fastify-web'

import { getWebHost, getWebPort, getAPIHost, getAPIPort } from './cliHelpers'
import { createServer as createApiServer } from './createServer'
import createFastifyInstance from './fastify'
import type { BothParsedOptions } from './types'

export async function handler(options: BothParsedOptions) {
  const timeStart = Date.now()
  console.log(chalk.dim.italic('Starting API and Web Servers...'))

  options.webHost ??= getWebHost()
  options.webPort ??= getWebPort()
  options.apiHost ??= getAPIHost()
  options.apiPort ??= getAPIPort()

  options.apiRootPath = coerceRootPath(options.apiRootPath ?? '/')

  const apiProxyTarget = [
    'http://',
    options.apiHost.includes(':') ? `[${options.apiHost}]` : options.apiHost,
    ':',
    options.apiPort,
    options.apiRootPath,
  ].join('')

  const webFastify = await createFastifyInstance()
  webFastify.register(redwoodFastifyWeb, {
    redwood: {
      apiProxyTarget,
    },
  })

  const apiFastify = await createApiServer({
    apiRootPath: options.apiRootPath,
  })

  await webFastify.listen({
    port: options.webPort,
    host: options.webHost,
    listenTextResolver: getListenTextResolver('Web'),
  })

  webFastify.log.trace(
    { custom: { ...webFastify.initialConfig } },
    'Fastify server configuration',
  )
  webFastify.log.trace(`Registered plugins\n${webFastify.printPlugins()}`)

  await apiFastify.listen({
    port: options.apiPort,
    host: options.apiHost,
    listenTextResolver: getListenTextResolver('API'),
  })

  apiFastify.log.trace(
    { custom: { ...apiFastify.initialConfig } },
    'Fastify server configuration',
  )
  apiFastify.log.trace(`Registered plugins\n${apiFastify.printPlugins()}`)

  console.log(chalk.dim.italic('Took ' + (Date.now() - timeStart) + ' ms'))

  const webServer = chalk.green(webFastify.listeningOrigin)
  const apiServer = chalk.magenta(
    `${apiFastify.listeningOrigin}${options.apiRootPath}`,
  )
  const graphqlEndpoint = chalk.magenta(`${apiServer}graphql`)

  console.log(`Web server listening at ${webServer}`)
  console.log(`API server listening at ${apiServer}`)
  console.log(`GraphQL endpoint at ${graphqlEndpoint}`)

  process?.send?.('ready')
}

function getListenTextResolver(side: string) {
  return (address: string) => {
    // In the past, in development, we've prioritized showing a friendlier
    // host than the listen-on-all-ipv6-addresses '[::]'. Here we replace it
    // with 'localhost' only if 1) we're not in production and 2) it's there.
    // In production it's important to be transparent.
    if (process.env.NODE_ENV !== 'production') {
      address = address.replace(/http:\/\/\[::\]/, 'http://localhost')
    }

    return `${side} server listening at ${address}`
  }
}
