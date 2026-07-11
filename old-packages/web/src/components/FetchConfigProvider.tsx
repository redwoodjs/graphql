import React from 'react'

import type { UseAuth } from '@redwoodjs/auth'
import { useNoAuth } from '@redwoodjs/auth'

export const getApiGraphQLUrl = () => {
  return globalThis.RWJS_API_GRAPHQL_URL
}

export interface FetchConfig {
  uri: string
  headers?: { 'auth-provider'?: string; authorization?: string }
}

export const FetchConfigContext = React.createContext<FetchConfig>({
  uri: getApiGraphQLUrl(),
})

interface Props {
  useAuth?: UseAuth
  children: React.ReactNode
}

/**
 * The `FetchConfigProvider` understands Redwood's Auth and determines the
 * correct request-headers based on a user's authentication state.
 * Note that the auth bearer token is now passed in packages/web/src/apollo/index.tsx
 * as the token is retrieved async
 */
export const FetchConfigProvider: React.FC<Props> = ({
  useAuth = useNoAuth,
  ...rest
}) => {
  const { isAuthenticated, type } = useAuth()

  if (!isAuthenticated) {
    return (
      <FetchConfigContext.Provider
        value={{ uri: getApiGraphQLUrl() }}
        {...rest}
      />
    )
  }

  // @NOTE: See packages/web/src/apollo/links.tsx
  // Where we remove the auth-provider header if token is null.
  // Token === null means you're logged out OR are using cookie/middleware auth
  const headers = {
    'auth-provider': type,
  }

  return (
    <FetchConfigContext.Provider
      value={{
        uri: getApiGraphQLUrl(),
        headers,
      }}
      {...rest}
    />
  )
}

export const useFetchConfig = () => React.useContext(FetchConfigContext)
