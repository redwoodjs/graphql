import { useCallback } from 'react'

import type { AuthImplementation } from '../AuthImplementation.js'

export const useToken = (authImplementation: AuthImplementation) => {
  return useCallback(async () => {
    /**
     * Clients should always return null or token string.
     * It is expected that they catch any errors internally.
     * This catch is a last resort effort in case any errors are
     * missed or slip through.
     */
    try {
      const token = await authImplementation.getToken()
      return token
    } catch (e) {
      console.error('Caught internal:', e)
      return null
    }
  }, [authImplementation])
}
