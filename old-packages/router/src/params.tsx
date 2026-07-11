import React, { useContext } from 'react'

import { createNamedContext } from './createNamedContext.js'

export interface ParamsContextProps {
  params: Record<string, string>
}

export const ParamsContext = createNamedContext<ParamsContextProps>('Params')

interface Props {
  allParams?: Record<any, any>
  children?: React.ReactNode
}

export const ParamsProvider: React.FC<Props> = ({ allParams, children }) => {
  return (
    <ParamsContext.Provider
      value={{
        params: {
          ...allParams,
        },
      }}
    >
      {children}
    </ParamsContext.Provider>
  )
}

export const useParams = () => {
  const paramsContext = useContext(ParamsContext)

  if (paramsContext === undefined) {
    throw new Error('useParams must be used within a ParamsProvider')
  }

  return paramsContext.params
}
