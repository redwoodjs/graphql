import { describe, it } from 'vitest'

import { matchInlineTransformSnapshot } from '../../../../testUtils/matchInlineTransformSnapshot'
import { matchTransformSnapshot } from '../../../../testUtils/matchTransformSnapshot'

describe('useArmor', () => {
  describe('when depthLimitOptions is not configured in the GraphQL handler', () => {
    it('makes no changes', async () => {
      await matchTransformSnapshot('useArmor', 'default')
    })
  })

  describe('when depthLimitOptions is configured in the GraphQL handler', () => {
    it('Modifies depthLimitOptions to use GraphQL Armor settings', async () => {
      await matchTransformSnapshot('useArmor', 'graphql')
    })

    it('Modifies depthLimitOptions to use GraphQL Armor settings (inline)', async () => {
      await matchInlineTransformSnapshot(
        'useArmor',
        `import { createGraphQLHandler } from '@redwoodjs/graphql-server'

      import directives from 'src/directives/**/*.{js,ts}'
      import sdls from 'src/graphql/**/*.sdl.{js,ts}'
      import services from 'src/services/**/*.{js,ts}'

      import { getCurrentUser } from 'src/lib/auth'
      import { db } from 'src/lib/db'
      import { logger } from 'src/lib/logger'

      export const handler = createGraphQLHandler({
        getCurrentUser,
        loggerConfig: { logger, options: {} },
        directives,
        sdls,
        services,
        depthLimitOptions: { maxDepth: 42 },

        onException: () => {
          // Disconnect from your database with an unhandled exception.
          db.$disconnect()
        },
      })`,
        `import { createGraphQLHandler } from '@redwoodjs/graphql-server'

      import directives from 'src/directives/**/*.{js,ts}'
      import sdls from 'src/graphql/**/*.sdl.{js,ts}'
      import services from 'src/services/**/*.{js,ts}'

      import { getCurrentUser } from 'src/lib/auth'
      import { db } from 'src/lib/db'
      import { logger } from 'src/lib/logger'

      export const handler = createGraphQLHandler({
        getCurrentUser,
        loggerConfig: { logger, options: {} },
        directives,
        sdls,
        services,
        armorConfig: { maxDepth: { n: 42 } },

        onException: () => {
          // Disconnect from your database with an unhandled exception.
          db.$disconnect()
        },
      })`,
      )
    })
  })
})
