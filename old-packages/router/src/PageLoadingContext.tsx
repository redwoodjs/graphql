import React, { useContext, useState } from 'react'

import { createNamedContext } from './createNamedContext.js'

export interface PageLoadingContextInterface {
  loading: boolean
  setPageLoadingContext: (loading: boolean) => void
  delay?: number
}

const PageLoadingContext =
  createNamedContext<PageLoadingContextInterface>('PageLoading')

interface Props {
  children: React.ReactNode
  delay?: number
}

export const PageLoadingContextProvider: React.FC<Props> = ({
  children,
  delay = 1000,
}) => {
  const [loading, setPageLoadingContext] = useState(false)

  return (
    <PageLoadingContext.Provider
      value={{ loading, setPageLoadingContext, delay }}
    >
      {children}
    </PageLoadingContext.Provider>
  )
}

export const usePageLoadingContext = () => {
  const pageLoadingContext = useContext(PageLoadingContext)

  if (!pageLoadingContext) {
    throw new Error(
      'usePageLoadingContext must be used within a PageLoadingContext provider',
    )
  }

  return pageLoadingContext
}
