/**
 * NOTE: This module should not contain any nodejs functionality,
 * because it's also used by Storybook in the browser.
 */
import React from 'react'

import { LocationProvider } from '@redwoodjs/router'
import { useAuth } from '@redwoodjs/testing/web'
import { RedwoodProvider } from '@redwoodjs/web'
import { RedwoodApolloProvider } from '@redwoodjs/web/apollo'

import { MockParamsProvider } from './MockParamsProvider'

// Import the user's Routes from `./web/src/Routes.{tsx,jsx}`,
// we pass the `children` from the user's Routes to `./MockRouter.Router`
// so that we can populate the `routes object` in Storybook and tests.
let UserRoutes: React.FC

try {
  const userRoutesModule = require('~__REDWOOD__USER_ROUTES_FOR_MOCK')
  UserRoutes = userRoutesModule.default
} catch {
  UserRoutes = () => <></>
}

// TODO(pc): see if there are props we want to allow to be passed into our mock provider (e.g. AuthProviderProps)
export const MockProviders: React.FunctionComponent<{
  children: React.ReactNode
}> = ({ children }) => {
  return (
    <RedwoodProvider titleTemplate="%PageTitle | %AppTitle">
      <RedwoodApolloProvider useAuth={useAuth}>
        <UserRoutes />
        <LocationProvider>
          <MockParamsProvider>{children}</MockParamsProvider>
        </LocationProvider>
      </RedwoodApolloProvider>
    </RedwoodProvider>
  )
}
