// MSW is used by Jest (NodeJS)
import { setupWorker, graphql } from 'msw'
import type {
  StartOptions as StartMSWWorkerOptions,
  SharedOptions as SharedMSWOptions,
  MockedResponse,
  DefaultBodyType,
  RequestHandler,
  GraphQLContext,
  GraphQLRequest,
  ResponseTransformer,
  SetupWorker,
  ResponseComposition,
} from 'msw'

// Allow users to call "mockGraphQLQuery" and "mockGraphQLMutation"
// before the server has started. We store the request handlers in
// a queue that is drained once the server is started.
let REQUEST_HANDLER_QUEUE: RequestHandler[] = []
let SERVER_INSTANCE: SetupWorker | any

/**
 * Plugs fetch for the correct target in order to capture requests.
 *
 * Request handlers can be registered lazily (via `mockGraphQL<Query|Mutation>`),
 * the queue will be drained and used.
 */

type StartOptions<Target> = Target extends 'browsers'
  ? StartMSWWorkerOptions
  : SharedMSWOptions
export const startMSW = async <Target extends 'node' | 'browsers'>(
  target: Target,
  options?: StartOptions<Target>,
) => {
  if (SERVER_INSTANCE) {
    return SERVER_INSTANCE
  }

  if (target === 'browsers') {
    SERVER_INSTANCE = setupWorker()
    await SERVER_INSTANCE.start(options)
  } else {
    const { setupServer } = require('msw/node')
    SERVER_INSTANCE = setupServer()
    await SERVER_INSTANCE.listen(options)
  }

  return SERVER_INSTANCE
}

export const setupRequestHandlers = () => {
  SERVER_INSTANCE.resetHandlers()
  // Register all the handlers that are stored in the queue.
  for (const handler of REQUEST_HANDLER_QUEUE) {
    SERVER_INSTANCE.use(handler)
  }
}

export const closeServer = () => {
  SERVER_INSTANCE.close()
}

export const registerHandler = (handler: RequestHandler) => {
  if (!SERVER_INSTANCE) {
    // The server hasn't started yet, so add the request handler to the queue.
    // The queue will be drained once the server has started.
    REQUEST_HANDLER_QUEUE = [...REQUEST_HANDLER_QUEUE, handler]
  } else {
    SERVER_INSTANCE.use(handler)
  }
}

export type DataFunction<
  Query extends Record<string, unknown> = Record<string, unknown>,
  QueryVariables = Record<string, any>,
> = (
  variables: QueryVariables,
  {
    req,
    ctx,
  }: {
    req: GraphQLRequest<any>
    ctx: GraphQLContext<Record<string, any>>
  },
) => Query | void

// These should get exported from MSW
type ResponseFunction<BodyType extends DefaultBodyType = any> = (
  ...transformers: ResponseTransformer<BodyType>[]
) => MockedResponse<BodyType>

type ResponseEnhancers = {
  once: ResponseFunction<any>
  networkError: (message: string) => void
}
type ResponseEnhancer = keyof ResponseEnhancers

const mockGraphQL = (
  type: 'query' | 'mutation',
  operation: string,
  data: DataFunction | Record<string, any>,
  responseEnhancer?: ResponseEnhancer,
) => {
  const resolver = (
    req: GraphQLRequest<any>,
    res: ResponseComposition<any>,
    ctx: GraphQLContext<Record<string, any>>,
  ) => {
    let d = data
    let responseTransforms: any[] = []

    if (typeof data === 'function') {
      // We wrap the original context return values and store them `ctxForResponse`,
      // so that we can provide them to the final `res()` call at the end of this
      // function.
      const captureTransform = <T extends any[], U>(fn: (...args: T) => U) => {
        return (...args: T): U => {
          const resTransform = fn(...args)
          responseTransforms = [...responseTransforms, resTransform]
          return resTransform
        }
      }
      const newCtx: GraphQLContext<Record<string, any>> = {
        status: captureTransform(ctx.status),
        delay: captureTransform(ctx.delay),
        errors: captureTransform(ctx.errors),
        set: captureTransform(ctx.set as any),
        fetch: captureTransform(ctx.fetch),
        data: captureTransform(ctx.data),
        extensions: captureTransform(ctx.extensions),
        cookie: captureTransform(ctx.cookie),
        field: captureTransform(ctx.field),
      }

      d = data(req.variables, {
        req,
        ctx: newCtx,
      })
    }

    return (responseEnhancer ? res[responseEnhancer] : res)(
      ctx.data(d) as any,
      ...responseTransforms,
    )
  }

  registerHandler(graphql[type](operation, resolver))
  return data
}

export const mockGraphQLQuery = <
  Query extends Record<string, unknown> = Record<string, unknown>,
  QueryVariables = Record<string, any>,
>(
  operation: string,
  data: DataFunction<Query, QueryVariables> | Query,
  responseEnhancer?: ResponseEnhancer,
) => {
  return mockGraphQL('query', operation, data, responseEnhancer)
}

export const mockGraphQLMutation = <
  Query extends Record<string, unknown> = Record<string, unknown>,
  QueryVariables = Record<string, any>,
>(
  operation: string,
  data: DataFunction<Query, QueryVariables> | Query,
  responseEnhancer?: ResponseEnhancer,
) => {
  return mockGraphQL('mutation', operation, data, responseEnhancer)
}

export const mockedUserMeta: { currentUser: Record<string, unknown> | null } = {
  currentUser: null,
}

export const mockCurrentUser = (user: Record<string, unknown> | null) => {
  mockedUserMeta.currentUser = user
  mockGraphQLQuery('__REDWOOD__AUTH_GET_CURRENT_USER', () => {
    return {
      redwood: {
        currentUser: user,
      },
    }
  })
}
