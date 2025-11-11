import path from 'path'

import type { Handler } from 'aws-lambda'
import chalk from 'chalk'
import fg from 'fast-glob'
import type { Options as FastGlobOptions } from 'fast-glob'
import type {
  FastifyReply,
  FastifyRequest,
  RequestGenericInterface,
} from 'fastify'
import { escape } from 'lodash'

import type { FluidHandler } from '@redwoodjs/api/fluid'
import { getPaths, getConfig } from '@redwoodjs/project-config'

import { requestHandler } from '../requestHandlers/awsLambdaFastify'
import { fluidRequestHandler } from '../requestHandlers/fluidFastify'

export type Lambdas = Record<string, Handler>
export type FluidHandlers = Record<string, Record<string, FluidHandler>>
export const LAMBDA_FUNCTIONS: Lambdas = {}
export const FLUID_FUNCTIONS: FluidHandlers = {}

// Import the API functions and add them to the LAMBDA_FUNCTIONS or FLUID_FUNCTIONS object

const isFluidMode = () => {
  const config = getConfig()
  return config.deploy?.target === 'vercel' && config.deploy?.vercel?.fluid
}

export const setLambdaFunctions = async (foundFunctions: string[]) => {
  const tsImport = Date.now()
  console.log(chalk.dim.italic('Importing Server Functions... '))
  const fluidMode = isFluidMode()

  const imports = foundFunctions.map(async (fnPath) => {
    const ts = Date.now()
    const routeName = path.basename(fnPath).replace('.js', '')

    const fnImport = await import(`file://${fnPath}`)

    if (fluidMode) {
      const httpMethods = [
        'GET',
        'POST',
        'PUT',
        'PATCH',
        'DELETE',
        'OPTIONS',
        'HEAD',
      ]
      const handlers: Record<string, FluidHandler> = {}
      let hasHandlers = false

      for (const method of httpMethods) {
        if (method in fnImport) {
          handlers[method] = fnImport[method]
          hasHandlers = true
        }
      }

      if ('default' in fnImport && typeof fnImport.default === 'function') {
        handlers.default = fnImport.default
        hasHandlers = true
      }

      if (hasHandlers) {
        FLUID_FUNCTIONS[routeName] = handlers
      } else {
        console.warn(
          routeName,
          'at',
          fnPath,
          'does not have HTTP method handlers (GET, POST, etc.) or a default handler.',
        )
      }
    } else {
      const handler: Handler = (() => {
        if ('handler' in fnImport) {
          return fnImport.handler
        }
        if ('default' in fnImport) {
          if ('handler' in fnImport.default) {
            return fnImport.default.handler
          }
        }
      })()

      LAMBDA_FUNCTIONS[routeName] = handler
      if (!handler) {
        console.warn(
          routeName,
          'at',
          fnPath,
          'does not have a function called handler defined.',
        )
      }
    }

    console.log(
      chalk.magenta('/' + routeName),
      chalk.dim.italic(Date.now() - ts + ' ms'),
    )
  })

  await Promise.all(imports)

  console.log(
    chalk.dim.italic('...Done importing in ' + (Date.now() - tsImport) + ' ms'),
  )
}

type LoadFunctionsFromDistOptions = {
  fastGlobOptions?: FastGlobOptions
  discoverFunctionsGlob?: string | string[]
}

// TODO: Use v8 caching to load these crazy fast.
export const loadFunctionsFromDist = async (
  options: LoadFunctionsFromDistOptions = {},
) => {
  const serverFunctions = findApiDistFunctions({
    cwd: getPaths().api.base,
    options: options?.fastGlobOptions,
    discoverFunctionsGlob: options?.discoverFunctionsGlob,
  })

  // Place `GraphQL` serverless function at the start.
  const i = serverFunctions.findIndex((x) => x.endsWith('graphql.js'))
  if (i >= 0) {
    const graphQLFn = serverFunctions.splice(i, 1)[0]
    serverFunctions.unshift(graphQLFn)
  }

  await setLambdaFunctions(serverFunctions)
}

// NOTE: Copied from @redwoodjs/internal/dist/files to avoid depending on @redwoodjs/internal.
// import { findApiDistFunctions } from '@redwoodjs/internal/dist/files'
const findApiDistFunctions = (params: {
  cwd: string
  options?: FastGlobOptions
  discoverFunctionsGlob?: string | string[]
}) => {
  const {
    cwd = getPaths().api.base,
    options = {},
    discoverFunctionsGlob = 'dist/functions/**/*.{ts,js}',
  } = params
  return fg.sync(discoverFunctionsGlob, {
    cwd,
    deep: 2, // We don't support deeply nested api functions, to maximise compatibility with deployment providers
    absolute: true,
    ...options,
  })
}

interface LambdaHandlerRequest extends RequestGenericInterface {
  Params: {
    routeName: string
  }
}

/**
 This will take a fastify request
 Then convert it to a lambdaEvent or Request object, and pass it to the appropriate handler for the routeName
 The LAMBDA_FUNCTIONS or FLUID_FUNCTIONS lookup has been populated already by this point
 **/
export const lambdaRequestHandler = async (
  req: FastifyRequest<LambdaHandlerRequest>,
  reply: FastifyReply,
) => {
  const { routeName } = req.params
  const fluidMode = isFluidMode()

  if (fluidMode) {
    const handlers = FLUID_FUNCTIONS[routeName]
    if (!handlers) {
      const errorMessage = `Function "${routeName}" was not found.`
      req.log.error(errorMessage)
      reply.status(404)

      if (process.env.NODE_ENV === 'development') {
        const devError = {
          error: errorMessage,
          availableFunctions: Object.keys(FLUID_FUNCTIONS),
        }
        reply.send(devError)
      } else {
        reply.send(escape(errorMessage))
      }

      return
    }

    const method = req.method.toUpperCase()
    const handler = handlers[method] || handlers.default

    if (!handler) {
      const errorMessage = `Method "${method}" not supported for function "${routeName}".`
      req.log.error(errorMessage)
      reply.status(405)

      if (process.env.NODE_ENV === 'development') {
        const devError = {
          error: errorMessage,
          availableMethods: Object.keys(handlers),
        }
        reply.send(devError)
      } else {
        reply.send(escape(errorMessage))
      }

      return
    }

    return fluidRequestHandler(req, reply, handler)
  } else {
    if (!LAMBDA_FUNCTIONS[routeName]) {
      const errorMessage = `Function "${routeName}" was not found.`
      req.log.error(errorMessage)
      reply.status(404)

      if (process.env.NODE_ENV === 'development') {
        const devError = {
          error: errorMessage,
          availableFunctions: Object.keys(LAMBDA_FUNCTIONS),
        }
        reply.send(devError)
      } else {
        reply.send(escape(errorMessage))
      }

      return
    }
    return requestHandler(req, reply, LAMBDA_FUNCTIONS[routeName])
  }
}
