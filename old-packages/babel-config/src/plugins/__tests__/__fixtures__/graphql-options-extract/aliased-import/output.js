import scuid from 'scuid'
import { createGraphQLHandler as someOtherFunctionName } from '@redwoodjs/graphql-server'
import directives from 'src/directives/**/*.{js,ts}'
import sdls from 'src/graphql/**/*.sdl.{js,ts}'
import services from 'src/services/**/*.{js,ts}'
import { db } from 'src/lib/db'
import { executionContext } from 'src/lib/executionContext'
import { logger } from 'src/lib/logger'
export const __rw_graphqlOptions = {
  loggerConfig: {
    logger,
    options: {},
  },
  directives,
  sdls,
  services,
  onException: () => {
    // Disconnect from your database with an unhandled exception.
    db.$disconnect()
  },
}
const graphQLHandler = someOtherFunctionName(__rw_graphqlOptions)
export const handler = async (event, context) => {
  const requestIdHeader = 'x-request-id'
  const requestId = event.headers[requestIdHeader] ?? scuid()
  const store = new Map([['requestId', requestId]])
  const response = await executionContext.run(store, () =>
    graphQLHandler(event, context)
  )
  return {
    ...response,
    headers: {
      ...(response.headers ?? {}),
      [requestIdHeader]: requestId,
    },
  }
}
