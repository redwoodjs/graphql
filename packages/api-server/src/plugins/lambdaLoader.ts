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

import { getPaths } from '@redwoodjs/project-config'

import { requestHandler } from '../requestHandlers/awsLambdaFastify'

export type Lambdas = Record<string, Handler>
export const LAMBDA_FUNCTIONS: Lambdas = {}

// Import the API functions and add them to the LAMBDA_FUNCTIONS object

export const setLambdaFunctions = async (foundFunctions: string[]) => {
  const tsImport = Date.now()
  console.log(chalk.dim.italic('Importing Server Functions... '))

  const imports = foundFunctions.map(async (fnPath) => {
    const ts = Date.now()
    const routeName = path.basename(fnPath).replace('.js', '')

    const { handler } = await import(`file://${fnPath}`)
    LAMBDA_FUNCTIONS[routeName] = handler
    if (!handler) {
      console.warn(
        routeName,
        'at',
        fnPath,
        'does not have a function called handler defined.',
      )
    }
    // TODO: Use terminal link.
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
 Then convert it to a lambdaEvent, and pass it to the the appropriate handler for the routeName
 The LAMBDA_FUNCTIONS lookup has been populated already by this point
 **/
export const lambdaRequestHandler = async (
  req: FastifyRequest<LambdaHandlerRequest>,
  reply: FastifyReply,
) => {
  const { routeName } = req.params

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
