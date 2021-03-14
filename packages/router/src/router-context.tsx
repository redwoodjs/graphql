import React, { useReducer, createContext, useContext } from 'react'

import type { AuthContextInterface, useAuth } from '@redwoodjs/auth'

import { ParamType } from './internal'

const DEFAULT_PAGE_LOADING_DELAY = 1000 // milliseconds

export interface RouterState {
  paramTypes?: Record<string, ParamType>
  pageLoadingDelay?: number
  useAuth: typeof useAuth
}

const RouterStateContext = createContext<RouterState | undefined>(undefined)

export interface RouterSetContextProps {
  setState: (newState: Partial<RouterState>) => void
}

const RouterSetContext = createContext<
  React.Dispatch<Partial<RouterState>> | undefined
>(undefined)

function stateReducer(state: RouterState, newState: Partial<RouterState>) {
  return { ...state, ...newState }
}

export const RouterContextProvider: React.FC<RouterState> = ({
  useAuth = () => ({} as AuthContextInterface),
  paramTypes,
  pageLoadingDelay = DEFAULT_PAGE_LOADING_DELAY,
  children,
}) => {
  const [state, setState] = useReducer(stateReducer, {
    useAuth,
    paramTypes,
    pageLoadingDelay,
  })

  return (
    <RouterStateContext.Provider value={state}>
      <RouterSetContext.Provider value={setState}>
        {children}
      </RouterSetContext.Provider>
    </RouterStateContext.Provider>
  )
}

export const useRouterState = () => {
  const context = useContext(RouterStateContext)

  if (context === undefined) {
    throw new Error(
      'useRouterState must be used within a RouterContextProvider'
    )
  }

  return context
}

export const useRouterStateSetter = () => {
  const context = useContext(RouterSetContext)

  if (context === undefined) {
    throw new Error(
      'useRouterStateSetter must be used within a RouterContextProvider'
    )
  }

  return context
}
