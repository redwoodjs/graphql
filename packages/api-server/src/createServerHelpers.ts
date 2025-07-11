import { parseArgs } from 'util'

import type {
  FastifyListenOptions,
  FastifyServerOptions,
  FastifyInstance,
} from 'fastify'

import { coerceRootPath } from '@redwoodjs/fastify-web/dist/helpers'

import { getAPIHost, getAPIPort } from './cliHelpers'

export type StartOptions = Omit<FastifyListenOptions, 'port' | 'host'>

export interface Server extends FastifyInstance {
  start: (options?: StartOptions) => Promise<string>
}

export interface CreateServerOptions {
  /**
   * The prefix for all routes. Defaults to `/`.
   */
  apiRootPath?: string

  /**
   * Logger instance or options.
   */
  logger?: FastifyServerOptions['logger']

  /**
   * Options for the fastify server instance.
   * Omitting logger here because we move it up.
   */
  fastifyServerOptions?: Omit<FastifyServerOptions, 'logger'>

  /**
   * Override the glob used to discover functions.
   * Defaults to: "dist/functions/**\/*.{ts,js}"
   */
  discoverfunctionsGlob?: string | string[]

  /**
   * Customise the API server fastify plugin before it is registered
   */
  configureApiServer?: (server: Server) => void | Promise<void>

  /**
   * Whether to parse args or not. Defaults to `true`.
   */
  parseArgs?: boolean
}

type DefaultCreateServerOptions = Required<
  Omit<CreateServerOptions, 'fastifyServerOptions'> & {
    fastifyServerOptions: FastifyServerOptions
  }
>

export const DEFAULT_CREATE_SERVER_OPTIONS: DefaultCreateServerOptions = {
  apiRootPath: '/',
  logger: {
    level:
      process.env.LOG_LEVEL ??
      (process.env.NODE_ENV === 'development' ? 'debug' : 'warn'),
  },
  fastifyServerOptions: {
    requestTimeout: 15_000,
    bodyLimit: 1024 * 1024 * 100, // 100MB
  },
  discoverfunctionsGlob: 'dist/functions/**/*.{ts,js}',
  configureApiServer: () => {},
  parseArgs: true,
}

export type ResolvedOptions = Required<
  Omit<CreateServerOptions, 'logger' | 'fastifyServerOptions' | 'parseArgs'> & {
    fastifyServerOptions: FastifyServerOptions
    apiPort: number
    apiHost: string
  }
>

export function resolveOptions(
  options: CreateServerOptions = {},
  args?: string[],
) {
  options.parseArgs ??= true

  options.logger ??= DEFAULT_CREATE_SERVER_OPTIONS.logger

  // Set defaults.
  const resolvedOptions: ResolvedOptions = {
    apiRootPath:
      options.apiRootPath ?? DEFAULT_CREATE_SERVER_OPTIONS.apiRootPath,

    fastifyServerOptions: options.fastifyServerOptions ?? {
      requestTimeout:
        DEFAULT_CREATE_SERVER_OPTIONS.fastifyServerOptions.requestTimeout,
      logger: options.logger ?? DEFAULT_CREATE_SERVER_OPTIONS.logger,
      bodyLimit: DEFAULT_CREATE_SERVER_OPTIONS.fastifyServerOptions.bodyLimit,
    },
    discoverfunctionsGlob:
      options.discoverfunctionsGlob ??
      DEFAULT_CREATE_SERVER_OPTIONS.discoverfunctionsGlob,
    configureApiServer:
      options.configureApiServer ??
      DEFAULT_CREATE_SERVER_OPTIONS.configureApiServer,
    apiHost: getAPIHost(),
    apiPort: getAPIPort(),
  }

  // Merge fastifyServerOptions.
  resolvedOptions.fastifyServerOptions.requestTimeout ??=
    DEFAULT_CREATE_SERVER_OPTIONS.fastifyServerOptions.requestTimeout
  resolvedOptions.fastifyServerOptions.logger = options.logger

  if (options.parseArgs) {
    const { values } = parseArgs({
      options: {
        apiHost: {
          type: 'string',
        },
        apiPort: {
          type: 'string',
          short: 'p',
        },
        apiRootPath: {
          type: 'string',
        },
      },
      strict: false,
      ...(args && { args }),
    })

    if (values.apiHost && typeof values.apiHost !== 'string') {
      throw new Error('`apiHost` must be a string')
    }
    if (values.apiHost) {
      resolvedOptions.apiHost = values.apiHost
    }

    if (values.apiPort) {
      resolvedOptions.apiPort = +values.apiPort

      if (isNaN(resolvedOptions.apiPort)) {
        throw new Error('`apiPort` must be an integer')
      }
    }

    if (values.apiRootPath && typeof values.apiRootPath !== 'string') {
      throw new Error('`apiRootPath` must be a string')
    }
    if (values.apiRootPath) {
      resolvedOptions.apiRootPath = values.apiRootPath
    }
  }

  resolvedOptions.apiRootPath = coerceRootPath(resolvedOptions.apiRootPath)

  return resolvedOptions
}
