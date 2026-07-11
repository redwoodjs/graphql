import type { Plugin } from 'graphql-yoga'

import type { AuthContextPayload, Decoder } from '@redwoodjs/api'
import { getAuthenticationContext } from '@redwoodjs/api'

import type { RedwoodGraphQLContext, GraphQLHandlerOptions } from '../types'

/**
 * Envelop plugin for injecting the current user into the GraphQL Context,
 * based on custom getCurrentUser function.
 */
export const useRedwoodAuthContext = (
  getCurrentUser: GraphQLHandlerOptions['getCurrentUser'],
  authDecoder?: Decoder | Decoder[],
): Plugin<RedwoodGraphQLContext> => {
  return {
    async onContextBuilding({ context, extendContext }) {
      const { requestContext } = context

      let authContext: AuthContextPayload | undefined = undefined

      try {
        authContext = await getAuthenticationContext({
          authDecoder,
          event: context.event,
          context: requestContext,
        })
      } catch (error: any) {
        throw new Error(
          `Exception in getAuthenticationContext: ${error.message}`,
        )
      }

      try {
        if (authContext) {
          const currentUser = getCurrentUser
            ? await getCurrentUser(
                authContext[0],
                authContext[1],
                authContext[2],
              )
            : null

          if (currentUser) {
            extendContext({ currentUser })
          }
        }
      } catch (error: any) {
        throw new Error(`Exception in getCurrentUser: ${error.message}`)
      }
    },
  }
}
