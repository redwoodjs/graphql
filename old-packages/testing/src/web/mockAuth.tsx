import React from 'react'

// Exporting everything here, but exports further down in this file will
// override exports with the same name
export * from '@redwoodjs/auth'

import { mockedUserMeta } from './mockRequests'

interface Props {
  children: React.ReactNode
}

const AuthProvider: React.FC<Props> = ({ children }) => {
  return <>{children}</>
}

function makeArray<T>(input?: T | T[]) {
  return !input ? [] : Array.isArray(input) ? input : [input]
}

// When running jest tests, this is what they'll get when they import `useAuth`
// thanks to some magic we do in jest-preset.js
export function useAuth() {
  return {
    loading: false,
    isAuthenticated: !!mockedUserMeta.currentUser,
    logIn: async () => {},
    logOut: async () => {},
    signUp: async () => {},
    currentUser: mockedUserMeta.currentUser,
    userMetadata: mockedUserMeta.currentUser,
    getToken: async () => null,
    getCurrentUser: async () => mockedUserMeta.currentUser,
    hasRole: (roles: string | string[]) => {
      const currentUserRoles = makeArray(
        mockedUserMeta.currentUser?.roles as string | string[] | undefined,
      )

      if (currentUserRoles) {
        return makeArray(roles).some((role) => currentUserRoles.includes(role))
      }

      return false
    },
    reauthenticate: async () => {},
    forgotPassword: async () => {},
    resetPassword: async () => {},
    validateResetToken: async () => {},
    type: 'default',
    client: undefined,
    hasError: false,
  }
}

export const createAuthentication = () => {
  return { AuthProvider, useAuth }
}
