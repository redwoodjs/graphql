// TODO (RSC): This should live in @redwoodjs/router but I didn't want to add
// `react-server-dom-webpack` as a dependency there. We should first figure out
// what to do about rscFetch here vs renderFromRscServer and see if maybe that
// one should live somewhere else where @redwoodjs/router can import from

import React, { useMemo } from 'react'

import { analyzeRoutes } from '@redwoodjs/router/dist/analyzeRoutes'
import { LocationProvider, useLocation } from '@redwoodjs/router/dist/location'
import { namedRoutes } from '@redwoodjs/router/dist/namedRoutes'
import type { RouterProps } from '@redwoodjs/router/dist/router'

import { rscFetch } from './clientRouterRscFetch'

export const Router = ({ paramTypes, children }: RouterProps) => {
  console.log('ClientRouter.tsx ClientRouter')
  return (
    // Wrap it in the provider so that useLocation can be used
    <LocationProvider>
      <LocationAwareRouter paramTypes={paramTypes}>
        {children}
      </LocationAwareRouter>
    </LocationProvider>
  )
}

const LocationAwareRouter = ({ paramTypes, children }: RouterProps) => {
  const { pathname, search } = useLocation()

  console.log(
    'ClientRouter.tsx LocationAwareRouter pathname: >%s< search: >%s<',
    pathname,
    search,
  )

  const { namedRoutesMap } = useMemo(() => {
    return analyzeRoutes(children, {
      currentPathName: pathname,
      userParamTypes: paramTypes,
    })
  }, [pathname, children, paramTypes])

  // Assign namedRoutes so it can be imported like import {routes} from 'rwjs/router'
  // Note that the value changes at runtime
  Object.assign(namedRoutes, namedRoutesMap)

  return rscFetch('__rwjs__Routes', { location: { pathname, search } })
}
