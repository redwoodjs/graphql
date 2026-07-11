import { createContext } from 'react'

/** Create a React Context with the given name. */
export function createNamedContext<T>(name: string, defaultValue?: T) {
  const Ctx = createContext<T | undefined>(defaultValue)
  Ctx.displayName = name
  return Ctx
}
