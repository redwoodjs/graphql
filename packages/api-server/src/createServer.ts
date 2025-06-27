import fs from 'fs'
import path from 'path'

import chalk from 'chalk'
import { config } from 'dotenv-defaults'
import fg from 'fast-glob'
import fastify from 'fastify/fastify'

import type { GlobalContext } from '@redwoodjs/context/dist'
import { getAsyncStoreInstance } from '@redwoodjs/context/dist/store'
import { getConfig, getPaths } from '@redwoodjs/project-config'

import { resolveOptions } from './createServerHelpers'
import type {
  CreateServerOptions,
  Server,
  StartOptions,
} from './createServerHelpers'
import { redwoodFastifyAPI } from './plugins/api'

// Load .env files if they haven't already been loaded. This makes importing this file effectful:
//
// ```js
// # Loads dotenv...
// import { createServer } from '@redwoodjs/api-server'
// ```
//
// We do it here and not in the function below so that users can access env vars before calling `createServer`
if (!process.env.REDWOOD_ENV_FILES_LOADED) {
  config({
    path: path.join(getPaths().base, '.env'),
    defaults: path.join(getPaths().base, '.env.defaults'),
    multiline: true,
  })

  process.env.REDWOOD_ENV_FILES_LOADED = 'true'
}

/**
 * Creates a server for api functions:
 *
 * ```js
 * import { createServer } from '@redwoodjs/api-server'
 *
 * import { logger } from 'src/lib/logger'
 *
  async function main() {
 *   const server = await createServer({
 *     logger,
 *     apiRootPath: 'api'
 *     configureApiServer: (server) => {
 *       // Configure the API server fastify instance, e.g. add content type parsers
 *     },
 *   })
 *
 *   // Configure the returned fastify instance:
 *   server.register(myPlugin)
 *
 *   // When ready, start the server:
 *   await server.start()
 * }
 *
 * main()
 * ```
 */
export async function createServer(options: CreateServerOptions = {}) {
  const {
    apiRootPath,
    fastifyServerOptions,
    configureApiServer,
    apiPort,
    apiHost,
  } = resolveOptions(options)

  // Warn about `api/server.config.js`
  const serverConfigPath = path.join(
    getPaths().base,
    getConfig().api.serverConfig,
  )

  if (fs.existsSync(serverConfigPath)) {
    console.warn(
      chalk.yellow(
        [
          '',
          `Ignoring \`config\` and \`configureServer\` in api/server.config.js.`,
          `Migrate them to api/src/server.{ts,js}:`,
          '',
          `\`\`\`js title="api/src/server.{ts,js}"`,
          '// Pass your config to `createServer`',
          'const server = createServer({',
          '  fastifyServerOptions: myFastifyConfig',
          '})',
          '',
          '// Then inline your `configureFastify` logic:',
          'server.register(myFastifyPlugin)',
          '```',
          '',
        ].join('\n'),
      ),
    )
  }

  // Initialize the fastify instance
  const server: Server = Object.assign(fastify(fastifyServerOptions), {
    // `start` will get replaced further down in this file
    start: async () => {
      throw new Error('Not implemented yet')
    },
  })

  server.addHook('onRequest', (_req, _reply, done) => {
    getAsyncStoreInstance().run(new Map<string, GlobalContext>(), done)
  })

  await server.register(redwoodFastifyAPI, {
    redwood: {
      apiRootPath,
      fastGlobOptions: {
        ignore: ['**/dist/functions/graphql.js'],
      },
      configureServer: configureApiServer,
    },
  })

  // If we can find `api/dist/functions/graphql.js`, register the GraphQL plugin
  const [graphqlFunctionPath] = await fg('dist/functions/graphql.{ts,js}', {
    cwd: getPaths().api.base,
    absolute: true,
  })

  if (graphqlFunctionPath) {
    const { redwoodFastifyGraphQLServer } = await import('./plugins/graphql.js')
    // This comes from a babel plugin that's applied to api/dist/functions/graphql.{ts,js} in user projects
    const { __rw_graphqlOptions } = await import(
      `file://${graphqlFunctionPath}`
    )

    await server.register(redwoodFastifyGraphQLServer, {
      redwood: {
        apiRootPath,
        graphql: __rw_graphqlOptions,
      },
    })
  }

  // For baremetal and pm2. See https://github.com/redwoodjs/redwood/pull/4744
  server.addHook('onReady', (done) => {
    process.send?.('ready')
    done()
  })

  server.addHook('onListen', (done) => {
    console.log(
      `Server listening at ${chalk.magenta(
        `${server.listeningOrigin}${apiRootPath}`,
      )}`,
    )
    done()
  })

  /**
   * A wrapper around `fastify.listen` that handles `--apiPort`, `REDWOOD_API_PORT` and [api].port in redwood.toml (same for host)
   *
   * The order of precedence is:
   * - `--apiPort`
   * - `REDWOOD_API_PORT`
   * - [api].port in redwood.toml
   */
  server.start = (options: StartOptions = {}) => {
    return server.listen({
      ...options,
      port: apiPort,
      host: apiHost,
    })
  }

  return server
}
