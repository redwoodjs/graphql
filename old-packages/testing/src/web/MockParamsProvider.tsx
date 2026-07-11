import React from 'react'

import { useLocation, ParamsContext, parseSearch } from '@redwoodjs/router'

interface Props {
  children?: React.ReactNode
}

export const MockParamsProvider: React.FC<Props> = ({ children }) => {
  const location = useLocation()
  const searchParams = parseSearch(location.search)

  return (
    <ParamsContext.Provider value={{ params: { ...searchParams } }}>
      {children}
    </ParamsContext.Provider>
  )
}
