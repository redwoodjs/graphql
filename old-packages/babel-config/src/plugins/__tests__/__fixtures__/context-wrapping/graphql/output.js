import { authDecoder } from '@redwoodjs/auth-dbauth-api'
import { createGraphQLHandler } from '@redwoodjs/graphql-server'
import directives from 'src/directives/**/*.{js,ts}'
import sdls from 'src/graphql/**/*.sdl.{js,ts}'
import services from 'src/services/**/*.{js,ts}'
import { getCurrentUser } from 'src/lib/auth'
import { db } from 'src/lib/db'
import { logger } from 'src/lib/logger'
import { getAsyncStoreInstance as __rw_getAsyncStoreInstance } from '@redwoodjs/context/dist/store'
const __rw_handler = createGraphQLHandler({
  authDecoder,
  getCurrentUser,
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
})
export const handler = (__rw_event, __rw__context) => {
  // The store will be undefined if no context isolation has been performed yet
  const __rw_contextStore = __rw_getAsyncStoreInstance().getStore()
  if (__rw_contextStore === undefined) {
    return __rw_getAsyncStoreInstance().run(
      new Map(),
      __rw_handler,
      __rw_event,
      __rw__context
    )
  }
  return __rw_handler(__rw_event, __rw__context)
}