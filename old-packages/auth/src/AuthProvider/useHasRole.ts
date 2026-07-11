import { useCallback } from 'react'

import type { CurrentUser } from '../AuthContext.js'

export const useHasRole = (currentUser: CurrentUser | null) => {
  /**
   * @example
   * ```js
   *  hasRole("editor")
   *  hasRole(["editor"])
   *  hasRole(["editor", "author"])
   * ```
   *
   * Checks if the "currentUser" from the api side
   * is assigned a role or one of a list of roles.
   * If the user is assigned any of the provided list of roles,
   * the hasRole is considered to be true.
   */
  return useCallback(
    (rolesToCheck: string | string[]): boolean => {
      if (currentUser?.roles) {
        if (typeof rolesToCheck === 'string') {
          if (typeof currentUser.roles === 'string') {
            // rolesToCheck is a string, currentUser.roles is a string
            return currentUser.roles === rolesToCheck
          } else if (Array.isArray(currentUser.roles)) {
            // rolesToCheck is a string, currentUser.roles is an array
            return currentUser.roles?.some(
              (allowedRole) => rolesToCheck === allowedRole,
            )
          }
        }

        if (Array.isArray(rolesToCheck)) {
          if (Array.isArray(currentUser.roles)) {
            // rolesToCheck is an array, currentUser.roles is an array
            return currentUser.roles?.some((allowedRole) =>
              rolesToCheck.includes(allowedRole),
            )
          } else if (typeof currentUser.roles === 'string') {
            // rolesToCheck is an array, currentUser.roles is a string
            return rolesToCheck.some(
              (allowedRole) => currentUser?.roles === allowedRole,
            )
          }
        }
      }

      return false
    },
    [currentUser],
  )
}
