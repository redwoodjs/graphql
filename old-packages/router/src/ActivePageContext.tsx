import { useContext } from 'react'

import { createNamedContext } from './createNamedContext.js'
import type { LocationContextType } from './location.js'

export type LoadingState = 'PRE_SHOW' | 'SHOW_LOADING' | 'DONE'
export type LoadingStateRecord = Record<
  string,
  | {
      specName: string
      state: LoadingState
      page: React.ComponentType<unknown>
      location: LocationContextType
    }
  | undefined
>

interface ActivePageState {
  loadingState: LoadingStateRecord
}

const ActivePageContext = createNamedContext<ActivePageState>('ActivePage')

export const ActivePageContextProvider = ActivePageContext.Provider

export const useActivePageContext = () => {
  const activePageContext = useContext(ActivePageContext)

  if (!activePageContext) {
    throw new Error(
      'useActivePageContext must be used within a ActivePageContext provider',
    )
  }

  return activePageContext
}
