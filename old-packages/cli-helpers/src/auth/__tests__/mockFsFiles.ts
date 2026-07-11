export const webAppTsx =
  "import { FatalErrorBoundary, RedwoodProvider } from '@redwoodjs/web'\n" +
  `import { RedwoodApolloProvider } from '@redwoodjs/web/apollo'

import FatalErrorPage from 'src/pages/FatalErrorPage'
import Routes from 'src/Routes'

import './index.css'

const App = () => (
  <FatalErrorBoundary page={FatalErrorPage}>
    <RedwoodProvider titleTemplate="%PageTitle | %AppTitle">
      <RedwoodApolloProvider>
        <Routes />
      </RedwoodApolloProvider>
    </RedwoodProvider>
  </FatalErrorBoundary>
)

export default App
`

export const graphqlTs =
  "import { createGraphQLHandler } from '@redwoodjs/graphql-server'\n" +
  `
import directives from 'src/directives/**/*.{js,ts}'
import sdls from 'src/graphql/**/*.sdl.{js,ts}'
import services from 'src/services/**/*.{js,ts}'

import { db } from 'src/lib/db'
import { logger } from 'src/lib/logger'

export const handler = createGraphQLHandler({
  loggerConfig: { logger, options: {} },
  directives,
  sdls,
  services,
  onException: () => {
    // Disconnect from your database with an unhandled exception.
    db.$disconnect()
  },
})
`

export const auth0WebAuthTsTemplate =
  "import { Auth0Client } from '@auth0/auth0-spa-js'\n" +
  `
import { createAuth } from '@redwoodjs/auth-auth0-web'

const auth0 = new Auth0Client({
  domain: process.env.AUTH0_DOMAIN || '',
  client_id: process.env.AUTH0_CLIENT_ID || '',
  redirect_uri: process.env.AUTH0_REDIRECT_URI,

  // ** NOTE ** Storing tokens in browser local storage provides persistence across page refreshes and browser tabs.
  // However, if an attacker can achieve running JavaScript in the SPA using a cross-site scripting (XSS) attack,
  // they can retrieve the tokens stored in local storage.
  // https://auth0.com/docs/libraries/auth0-spa-js#change-storage-options
  cacheLocation: 'localstorage',
  audience: process.env.AUTH0_AUDIENCE,

  // @MARK useRefreshTokens is required for automatically extending sessions
  // beyond that set in the initial JWT expiration.
  //
  // @see https://auth0.com/docs/tokens/refresh-tokens
  // useRefreshTokens: true,
})

export const { AuthProvider, useAuth } = createAuth(auth0)
`

export const clerkWebAuthTsTemplate =
  "import React, { useEffect } from 'react'\n" +
  `
import { ClerkLoaded, ClerkProvider, useUser } from '@clerk/clerk-react'

import { createAuth } from '@redwoodjs/auth-clerk-web'

// You can set user roles in a "roles" array on the public metadata in Clerk.
//
// Also, you need to add three env variables: CLERK_FRONTEND_API_URL for web and
// CLERK_API_KEY plus CLERK_JWT_KEY for api. All three can be found under "API Keys"
// on your Clerk.dev dashboard.
//
// Lastly, be sure to add the key "CLERK_FRONTEND_API_URL" in your app's redwood.toml
// [web] config "includeEnvironmentVariables" setting.

export const { AuthProvider: ClerkRwAuthProvider, useAuth } = createAuth()

interface Props {
  children: React.ReactNode
}

const ClerkStatusUpdater = () => {
  const { isSignedIn, user, isLoaded } = useUser()
  const { reauthenticate } = useAuth()

  useEffect(() => {
    if (isLoaded) {
      reauthenticate()
    }
  }, [isSignedIn, user, reauthenticate, isLoaded])

  return null
}

export const AuthProvider = ({ children }: Props) => {
  const frontendApi = process.env.CLERK_FRONTEND_API_URL
  if (!frontendApi) {
    throw new Error('Need to define env variable CLERK_FRONTEND_API_URL')
  }

  return (
    <ClerkProvider frontendApi={frontendApi} navigate={(to) => navigate(to)}>
      <ClerkRwAuthProvider>
        <ClerkLoaded>{children}</ClerkLoaded>
        <ClerkStatusUpdater />
      </ClerkRwAuthProvider>
    </ClerkProvider>
  )
}
`

export const routesTsx =
  "// In this file, all Page components from 'src/pages` are auto-imported. Nested\n" +
  `// directories are supported, and should be uppercase. Each subdirectory will be
// prepended onto the component name.
//
// Examples:
//
// 'src/pages/HomePage/HomePage.js'         -> HomePage
// 'src/pages/Admin/BooksPage/BooksPage.js' -> AdminBooksPage

import { Router, Route } from '@redwoodjs/router'

const Routes = () => {
  return (
    <Router>
      <Route notfound page={NotFoundPage} />
    </Router>
  )
}

export default Routes
`

export const legacyAuthWebAppTsx =
  "import netlifyIdentity from 'netlify-identity-widget'\n" +
  `
import { AuthProvider } from '@redwoodjs/auth'
import { isBrowser } from '@redwoodjs/prerender/browserUtils'
import { FatalErrorBoundary, RedwoodProvider } from '@redwoodjs/web'
import { RedwoodApolloProvider } from '@redwoodjs/web/apollo'

import FatalErrorPage from 'src/pages/FatalErrorPage'
import Routes from 'src/Routes'

import './index.css'

isBrowser && netlifyIdentity.init()

const App = () => (
  <FatalErrorBoundary page={FatalErrorPage}>
    <RedwoodProvider titleTemplate="%PageTitle | %AppTitle">
      <AuthProvider client={netlifyIdentity} type="netlify">
        <RedwoodApolloProvider>
          <Routes />
        </RedwoodApolloProvider>
      </AuthProvider>
    </RedwoodProvider>
  </FatalErrorBoundary>
)

export default App
`

export const customApolloAppTsx =
  "import { FatalErrorBoundary, RedwoodProvider } from '@redwoodjs/web'\n" +
  `import { RedwoodApolloProvider } from '@redwoodjs/web/apollo'

import FatalErrorPage from 'src/pages/FatalErrorPage'
import Routes from 'src/Routes'

import './index.css'

const App = () => (
  <FatalErrorBoundary page={FatalErrorPage}>
    <RedwoodProvider titleTemplate="%PageTitle | %AppTitle">
      <RedwoodApolloProvider graphQLClientConfig={{ cache }}>
        <Routes />
      </RedwoodApolloProvider>
    </RedwoodProvider>
  </FatalErrorBoundary>
)

export default App
`

export const customPropsRoutesTsx =
  "// In this file, all Page components from 'src/pages` are auto-imported. Nested\n" +
  `// directories are supported, and should be uppercase. Each subdirectory will be
// prepended onto the component name.
//
// Examples:
//
// 'src/pages/HomePage/HomePage.js'         -> HomePage
// 'src/pages/Admin/BooksPage/BooksPage.js' -> AdminBooksPage

import { Router, Route } from '@redwoodjs/router'

const Routes = () => {
  return (
    <Router
      pageLoadingDelay={400}
      trailingSlashes="always"
      paramTypes={{
        foo: {
          match: /foo/,
          parse: (value: string) => value.split('').reverse().join(''),
        },
      }}
    >
      <Route notfound page={NotFoundPage} />
    </Router>
  )
}

export default Routes
`

export const useAuthRoutesTsx =
  "// In this file, all Page components from 'src/pages` are auto-imported. Nested\n" +
  `// directories are supported, and should be uppercase. Each subdirectory will be
// prepended onto the component name.
//
// Examples:
//
// 'src/pages/HomePage/HomePage.js'         -> HomePage
// 'src/pages/Admin/BooksPage/BooksPage.js' -> AdminBooksPage

import { Router, Route } from '@redwoodjs/router'

const Routes = () => {
  return (
    <Router
      pageLoadingDelay={400}
      trailingSlashes="always"
      paramTypes={{
        foo: {
          match: /foo/,
          parse: (value: string) => value.split('').reverse().join(''),
        },
      }}
      useAuth={() => ({
        loading: false,
        isAuthenticated: false
      })}
    >
      <Route notfound page={NotFoundPage} />
    </Router>
  )
}

export default Routes
`

export const explicitReturnAppTsx =
  "import { useEffect } from 'react'\n" +
  `import { FatalErrorBoundary, RedwoodProvider } from '@redwoodjs/web'
import { RedwoodApolloProvider } from '@redwoodjs/web/apollo'

import FatalErrorPage from 'src/pages/FatalErrorPage'
import Routes from 'src/Routes'

import './index.css'

const App = (props) => {
  const { cache } = props

  useEffect(() => {
    console.log('Running my custom useEffect hook on each render.')
  })

  return (
    <FatalErrorBoundary page={FatalErrorPage}>
      <RedwoodProvider titleTemplate="%PageTitle | %AppTitle">
        <RedwoodApolloProvider>
          <AnotherProvider>
            <Routes />
          </AnotherProvider>
        </RedwoodApolloProvider>
      </RedwoodProvider>
    </FatalErrorBoundary>
  )
}

export default App
`

export const withoutRedwoodApolloAppTsx =
  "import { FatalErrorBoundary, RedwoodProvider } from '@redwoodjs/web'\n" +
  `
import FatalErrorPage from 'src/pages/FatalErrorPage'
import Routes from 'src/Routes'

import './index.css'

const queryClient = {}

const App = () => (
  <FatalErrorBoundary page={FatalErrorPage}>
    <RedwoodProvider titleTemplate="%PageTitle | %AppTitle">
      <QueryClientProvider client={queryClient}>
        <RedwoodReactQueryProvider>
          <Routes />
        </RedwoodReactQueryProvider>
      </QueryClientProvider>
    </RedwoodProvider>
  </FatalErrorBoundary>
)

export default App
`

export const withAuthDecoderGraphqlTs =
  "import { authDecoder } from '@redwoodjs/auth-dbauth-api'\n" +
  `import { createGraphQLHandler } from '@redwoodjs/graphql-server'

import directives from 'src/directives/**/*.{js,ts}'
import sdls from 'src/graphql/**/*.sdl.{js,ts}'
import services from 'src/services/**/*.{js,ts}'

import { getCurrentUser } from 'src/lib/auth'
import { db } from 'src/lib/db'
import { logger } from 'src/lib/logger'

export const handler = createGraphQLHandler({
  authDecoder,
  getCurrentUser,
  loggerConfig: { logger, options: {} },
  directives,
  sdls,
  services,
  onException: () => {
    // Disconnect from your database with an unhandled exception.
    db.$disconnect()
  },
})
`

export const nonStandardAuthDecoderGraphqlTs =
  "import { authDecoder as dbAuthAuthDecoder } from '@redwoodjs/auth-dbauth-api'\n" +
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
  onException: () => {
    // Disconnect from your database with an unhandled exception.
    db.$disconnect()
  },
  authDecoder: dbAuthAuthDecoder,
})
`
