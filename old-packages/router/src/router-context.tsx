import React, { createContext, useContext, useMemo } from 'react'

import type { AuthContextInterface } from '@redwoodjs/auth' with { 'resolution-mode': 'import' }
import { useNoAuth } from '@redwoodjs/auth'

import type { analyzeRoutes } from './analyzeRoutes.js'
import type { ParamType } from './util.js'

type UseAuth = () => AuthContextInterface<
  unknown,
  unknown,
  unknown,
  unknown,
  unknown,
  unknown,
  unknown,
  unknown,
  unknown,
  unknown,
  unknown,
  unknown
>

export interface RouterState {
  paramTypes?: Record<string, ParamType>
  useAuth: UseAuth
  routes: ReturnType<typeof analyzeRoutes>
  activeRouteName?: string | undefined | null
}

const RouterStateContext = createContext<RouterState | undefined>(undefined)

export interface RouterContextProviderProps
  extends Omit<RouterState, 'useAuth'> {
  useAuth?: UseAuth
  routes: ReturnType<typeof analyzeRoutes>
  activeRouteName?: string | undefined | null
  children: React.ReactNode
}

export const RouterContextProvider: React.FC<RouterContextProviderProps> = ({
  useAuth,
  paramTypes,
  routes,
  activeRouteName,
  children,
}) => {
  const state = useMemo(
    () => ({
      useAuth: useAuth || useNoAuth,
      paramTypes,
      routes,
      activeRouteName,
    }),
    [useAuth, paramTypes, routes, activeRouteName],
  )

  return (
    <RouterStateContext.Provider value={state}>
      {children}
    </RouterStateContext.Provider>
  )
}

export const useRouterState = () => {
  const context = useContext(RouterStateContext)

  if (context === undefined) {
    throw new Error(
      'useRouterState must be used within a RouterContextProvider',
    )
  }

  return context
}
