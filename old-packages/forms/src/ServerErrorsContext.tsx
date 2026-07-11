import React from 'react'

/** Context for keeping track of errors from the server */
interface ServerErrorsContextProps {
  [key: string]: string
}

export const ServerErrorsContext = React.createContext(
  {} as ServerErrorsContextProps,
)
