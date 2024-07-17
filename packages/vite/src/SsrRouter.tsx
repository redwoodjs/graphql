// TODO (RSC): This should live in @redwoodjs/router I think. But we should
// figure out what to do with ClientRouter first, and then we can think about
// this file.

import React, { useMemo } from 'react'

import { analyzeRoutes } from '@redwoodjs/router/analyzeRoutes'
import { LocationProvider, useLocation } from '@redwoodjs/router/location'
import { namedRoutes } from '@redwoodjs/router/namedRoutes'
import type { RouterProps } from '@redwoodjs/router/router'

import { renderRoutesFromDist } from './clientSsr.js'

export const Router = ({ paramTypes, children }: RouterProps) => {
  return (
    <LocationProvider>
      <LocationAwareRouter paramTypes={paramTypes}>
        {children}
      </LocationAwareRouter>
    </LocationProvider>
  )
}

const LocationAwareRouter = ({ paramTypes, children }: RouterProps) => {
  const { pathname } = useLocation()

  const { namedRoutesMap } = useMemo(() => {
    return analyzeRoutes(children, {
      currentPathName: pathname,
      userParamTypes: paramTypes,
    })
  }, [pathname, children, paramTypes])

  // Assign namedRoutes so it can be imported like import {routes} from 'rwjs/router'
  // Note that the value changes at runtime
  Object.assign(namedRoutes, namedRoutesMap)

  return renderRoutesFromDist(pathname)
}
