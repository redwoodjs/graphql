import React, { createContext, useContext } from 'react'

import type { DocumentNode } from 'graphql'

export interface QueryInfo {
  query: DocumentNode
  variables?: Record<string, unknown>
  renderLoading?: boolean
  hasProcessed: boolean
  data?: unknown
}

export interface CellCacheState {
  queryCache: Record<string, QueryInfo | undefined>
}

const CellCacheContext = createContext<CellCacheState | undefined>(undefined)

interface Props {
  queryCache: Record<string, QueryInfo | undefined>
  children?: React.ReactNode
}

export const CellCacheContextProvider = ({ queryCache, children }: Props) => {
  return (
    <CellCacheContext.Provider value={{ queryCache }}>
      {children}
    </CellCacheContext.Provider>
  )
}

export function useCellCacheContext() {
  const context = useContext(CellCacheContext)

  if (!context) {
    throw new Error(
      'useCellCacheContext must be used within a CellCacheContextProvider',
    )
  }

  return context
}
