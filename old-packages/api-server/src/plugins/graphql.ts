import fastifyMultiPart from '@fastify/multipart'
import fastifyUrlData from '@fastify/url-data'
import fg from 'fast-glob'
import type {
  FastifyInstance,
  HTTPMethods,
  FastifyReply,
  FastifyRequest,
} from 'fastify'

import type { GlobalContext } from '@redwoodjs/context'
import { getAsyncStoreInstance } from '@redwoodjs/context/dist/store'
import { coerceRootPath } from '@redwoodjs/fastify-web/dist/helpers'
import { createGraphQLYoga } from '@redwoodjs/graphql-server'
import type { GraphQLYogaOptions } from '@redwoodjs/graphql-server'
import { getPaths } from '@redwoodjs/project-config'

import { lambdaEventForFastifyRequest } from '../requestHandlers/awsLambdaFastify'

export interface RedwoodFastifyGraphQLOptions {
  redwood: {
    apiRootPath?: string
    graphql?: GraphQLYogaOptions
  }
}

export async function redwoodFastifyGraphQLServer(
  fastify: FastifyInstance,
  options: RedwoodFastifyGraphQLOptions,
) {
  const redwoodOptions = options.redwood ?? {}
  redwoodOptions.apiRootPath ??= '/'
  redwoodOptions.apiRootPath = coerceRootPath(redwoodOptions.apiRootPath)

  fastify.register(fastifyUrlData)
  // We register the multiPart plugin, but not the raw body plugin.
  // This is to allow multi-part form data to be parsed - otherwise you get errors
  fastify.register(fastifyMultiPart)

  const method = ['GET', 'POST', 'OPTIONS'] as HTTPMethods[]

  fastify.addHook('onRequest', (_req, _reply, done) => {
    getAsyncStoreInstance().run(new Map<string, GlobalContext>(), done)
  })

  try {
    // Load the graphql options from the user's graphql function if none are explicitly provided
    if (!redwoodOptions.graphql) {
      const [graphqlFunctionPath] = await fg('dist/functions/graphql.{ts,js}', {
        cwd: getPaths().api.base,
        absolute: true,
      })

      const { __rw_graphqlOptions } = await import(
        `file://${graphqlFunctionPath}`
      )
      redwoodOptions.graphql = __rw_graphqlOptions as GraphQLYogaOptions
    }

    const graphqlOptions = redwoodOptions.graphql

    // Here we can add any plugins that we want to use with GraphQL Yoga Server
    // that we do not want to add the the GraphQLHandler in the graphql-server
    // graphql function.
    //
    // These would be plugins that need a server instance such as Redwood Realtime
    if (graphqlOptions?.realtime) {
      const { useRedwoodRealtime } = await import('@redwoodjs/realtime')

      const originalExtraPlugins = graphqlOptions.extraPlugins ?? []
      // @ts-expect-error TODO(jgmw): Fix this type issue introduced after switching to Node16 module resolution
      originalExtraPlugins.push(useRedwoodRealtime(graphqlOptions.realtime))
      graphqlOptions.extraPlugins = originalExtraPlugins

      // uses for SSE single connection mode with the `/graphql/stream` endpoint
      if (graphqlOptions.realtime.subscriptions) {
        method.push('PUT')
      }
    }

    const { yoga } = createGraphQLYoga(graphqlOptions)

    const graphQLYogaHandler = async (
      req: FastifyRequest,
      reply: FastifyReply,
    ) => {
      const response = await yoga.handleNodeRequest(req, {
        req,
        reply,
        event: lambdaEventForFastifyRequest(req),
        requestContext: {},
      })

      for (const [name, value] of response.headers) {
        reply.header(name, value)
      }

      reply.status(response.status)
      reply.send(response.body)

      return reply
    }

    const graphqlEndpoint = trimSlashes(yoga.graphqlEndpoint)

    const routePaths = ['', '/health', '/readiness', '/stream']
    for (const routePath of routePaths) {
      fastify.route({
        url: `${redwoodOptions.apiRootPath}${graphqlEndpoint}${routePath}`,
        method,
        handler: (req, reply) => graphQLYogaHandler(req, reply),
      })
    }

    fastify.addHook('onReady', (done) => {
      console.info(`GraphQL Yoga Server endpoint at ${graphqlEndpoint}`)
      console.info(
        `GraphQL Yoga Server Health Check endpoint at ${graphqlEndpoint}/health`,
      )
      console.info(
        `GraphQL Yoga Server Readiness endpoint at ${graphqlEndpoint}/readiness`,
      )

      done()
    })
  } catch (e) {
    console.log(e)
  }
}

function trimSlashes(path: string) {
  return path.replace(/^\/|\/$/g, '')
}
