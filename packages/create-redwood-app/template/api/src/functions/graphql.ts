import {
  createGraphQLHandler,
} from '@redwoodjs/graphql-server'

import directives from 'src/directives/**/*.{js,ts}'
import services from 'src/services/**/*.{js,ts}'
import sdls from 'src/graphql/**/*.{js,ts}'

import { db } from 'src/lib/db'
import { logger } from 'src/lib/logger'

export const handler = createGraphQLHandler({
  loggerConfig: { logger, options: {} },
  services,
  sdls,
  directives,
  onException: () => {
    // Disconnect from your database with an unhandled exception.
    db.$disconnect()
  },
})
