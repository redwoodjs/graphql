import type { HttpOptions, Operation } from '@apollo/client'
import { Observable } from '@apollo/client/core/index.js'
import { setContext } from '@apollo/client/link/context/index.js'
import { ApolloLink } from '@apollo/client/link/core/index.js'
import { HttpLink } from '@apollo/client/link/http/index.js'
import { print } from 'graphql/language/printer.js'

export function createHttpLink(
  uri: string,
  httpLinkConfig: HttpOptions | undefined,
  cookieHeader?: string | null,
) {
  const headers: Record<string, string> = {}

  if (cookieHeader) {
    headers.cookie = cookieHeader
  }

  return new HttpLink({
    uri,
    credentials: 'include',
    ...httpLinkConfig,
    headers,
  })
}

function enhanceError(operation: Operation, error: any) {
  const { operationName, query, variables } = operation

  error.__RedwoodEnhancedError = {
    operationName,
    operationKind: query?.kind.toString(),
    variables,
    query: query && print(query),
  }

  return error
}

export function createUpdateDataLink() {
  return new ApolloLink((operation, forward) => {
    return new Observable((observer) => {
      forward(operation).subscribe({
        next(result) {
          if (result.errors) {
            result.errors.forEach((error) => {
              enhanceError(operation, error)
            })
          }
          observer.next(result)
        },
        error(error: any) {
          observer.error(enhanceError(operation, error))
        },
        complete: observer.complete.bind(observer),
      })
    })
  })
}
export function createAuthApolloLink(
  authProviderType: string,
  headersFromFetchProvider:
    | {
        'auth-provider'?: string | undefined
        authorization?: string | undefined
      }
    | undefined,
) {
  return new ApolloLink((operation, forward) => {
    const { token } = operation.getContext()
    // Only add auth headers when there's a token. `token` is `null` when `!isAuthenticated`.
    const authHeaders = token
      ? {
          'auth-provider': authProviderType,
          authorization: `Bearer ${token}`,
        }
      : {}

    if (!token) {
      // If there's no token i.e. it's using middleware auth
      // remove the auth-provider header
      delete headersFromFetchProvider?.['auth-provider']
    }

    operation.setContext(() => ({
      headers: {
        ...operation.getContext().headers,
        ...headersFromFetchProvider,
        // Duped auth headers, because we may remove the `FetchConfigProvider` at a later date.
        ...authHeaders,
      },
    }))

    return forward(operation)
  })
}
export function createTokenLink(getToken: () => Promise<string | null>) {
  return setContext(async () => {
    const token = await getToken()

    return { token }
  })
}

export function createFinalLink({
  userConfiguredLink,
  defaultLinks,
}: {
  userConfiguredLink?: ApolloLink | RedwoodApolloLinkFactory
  defaultLinks: RedwoodApolloLinks
}): ApolloLink {
  if (userConfiguredLink) {
    if (typeof userConfiguredLink === 'function') {
      return userConfiguredLink(defaultLinks)
    } else {
      return userConfiguredLink
    }
  }

  return ApolloLink.from(defaultLinks.map((l) => l.link))
}

// ~~~ Types ~~~

export type RedwoodApolloLink<
  Name extends RedwoodApolloLinkName,
  Link extends ApolloLink = ApolloLink,
> = {
  name: Name
  link: Link
}

export type RedwoodApolloLinks = (
  | RedwoodApolloLink<'withToken'>
  | RedwoodApolloLink<'authMiddleware'>
  | RedwoodApolloLink<'enhanceErrorLink'>
  | RedwoodApolloLink<'httpLink', HttpLink>
)[]

// DummyLink is needed to prevent circular dependencies when defining
// RedwoodApolloLinkName
// (Just replace DummyLink with RedwoodApolloLink in the InferredLinkName type
// helper and you'll see what I mean)
type DummyLink<T extends string> = { name: T }
type InferredLinkName<T> = T extends DummyLink<infer Name>[] ? Name : never
export type RedwoodApolloLinkName = InferredLinkName<RedwoodApolloLinks>

export type RedwoodApolloLinkFactory = (links: RedwoodApolloLinks) => ApolloLink
