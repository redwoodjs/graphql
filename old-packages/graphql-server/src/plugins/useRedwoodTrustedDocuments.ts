import { usePersistedOperations } from '@graphql-yoga/plugin-persisted-operations'
import type { UsePersistedOperationsOptions } from '@graphql-yoga/plugin-persisted-operations'
import type { Plugin } from 'graphql-yoga'

import type { RedwoodGraphQLContext } from '../types'

export type RedwoodTrustedDocumentOptions = Omit<
  UsePersistedOperationsOptions,
  'getPersistedOperation'
> & {
  /**
   * Whether to disable the plugin
   * @default false
   */
  disabled?: boolean

  /**
   * The store to get the persisted operation hash from
   * Required when the plugin is not disabled
   */
  store?: Readonly<Record<string, string>>
} & (
    | { disabled: true; store?: Readonly<Record<string, string>> }
    | { disabled?: false; store: Readonly<Record<string, string>> }
  )

const REDWOOD__AUTH_GET_CURRENT_USER_QUERY =
  '{"query":"query __REDWOOD__AUTH_GET_CURRENT_USER { redwood { currentUser } }"}'

/**
 * When using Redwood Auth, we want to allow the known, trusted `redwood.currentUser` query to be
 * executed without a persisted operation.
 *
 * This is because the `currentUser` query is a special case that is used to get
 * the current user from the auth provider.
 *
 * This function checks if the request is for the `currentUser` query and has the correct headers
 * which are set by the useCurrentUser hook in the auth package.
 *
 * The usePersistedOperations plugin relies on this function to determine if a request
 * should be allowed to execute via its allowArbitraryOperations option.
 */
const allowRedwoodAuthCurrentUserQuery = async (request: Request) => {
  const headers = request.headers
  const hasContentType = headers.get('content-type') === 'application/json'
  const hasAuthProvider = !!headers.get('auth-provider')
  const hasAuthorization = !!headers.get('authorization')
  const hasAllowedHeaders =
    hasContentType && hasAuthProvider && hasAuthorization

  const query = await request.text()
  const hasAllowedQuery = query === REDWOOD__AUTH_GET_CURRENT_USER_QUERY

  return hasAllowedHeaders && hasAllowedQuery
}

export const useRedwoodTrustedDocuments = (
  options: RedwoodTrustedDocumentOptions,
): Plugin<RedwoodGraphQLContext> => {
  return usePersistedOperations({
    ...options,
    customErrors: {
      persistedQueryOnly: 'Use Trusted Only!',
      ...options.customErrors,
    },
    getPersistedOperation(sha256Hash: string) {
      return options.store ? options.store[sha256Hash] : null
    },
    allowArbitraryOperations: async (request) => {
      if (options.allowArbitraryOperations !== undefined) {
        if (typeof options.allowArbitraryOperations === 'boolean') {
          if (options.allowArbitraryOperations) {
            return true
          }
        }
        if (typeof options.allowArbitraryOperations === 'function') {
          const result = await options.allowArbitraryOperations(request)
          if (result === true) {
            return true
          }
        }
      }
      return allowRedwoodAuthCurrentUserQuery(request)
    },
  })
}
