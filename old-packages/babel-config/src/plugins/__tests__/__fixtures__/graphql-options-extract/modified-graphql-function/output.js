import { createGraphQLHandler } from '@redwoodjs/graphql-server'
import directives from 'src/directives/**/*.{js,ts}'
import sdls from 'src/graphql/**/*.sdl.{js,ts}'
import services from 'src/services/**/*.{js,ts}'
import { db } from 'src/lib/db'
import { logger } from 'src/lib/logger'
export const handling = () => {
  console.log('handling')
}
const config = {
  loggerConfig: {
    logger,
    options: {},
  },
  directives,
  sdls,
  services,
  onException() {
    // Disconnect from your database with an unhandled exception.
    db.$disconnect()
  },
  extraPlugins: [
    {
      name: 'test',
      function: () => {
        console.log('test')
      },
    },
  ],
  graphiQLEndpoint: 'coolness',
  allowGraphiQL: false,
}

/**
 * Comments...
 */
export const __rw_graphqlOptions = config
export const handler = createGraphQLHandler(__rw_graphqlOptions)