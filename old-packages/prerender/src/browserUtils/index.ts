import type { ReactElement } from 'react'
import { useMemo } from 'react'

/* Web side prerender utils, to be used on the browser */

export const isPrerendering = (): boolean => {
  return globalThis.__REDWOOD__PRERENDERING ?? false
}

export const isBrowser = !isPrerendering()

export const useIsBrowser = () => {
  return useMemo(() => {
    return !globalThis?.__REDWOOD__PRERENDERING
  }, [])
}

export const BrowserOnly = ({ children }: { children: ReactElement }) => {
  const isBrowser = useIsBrowser()

  return isBrowser ? children : null
}
