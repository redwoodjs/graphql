import { useEffect } from 'react'

import type { NavigateOptions } from './history.js'
import { navigate } from './history.js'

interface RedirectProps {
  /** The path to redirect to */
  to: string
  options?: NavigateOptions
}

/**
 * A declarative way to redirect to a route name
 */
export const Redirect = ({ to, options }: RedirectProps) => {
  useEffect(() => {
    navigate(to, options)
  }, [to, options])

  return null
}
