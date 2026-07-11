import React, { useEffect } from 'react'

import { ClerkProvider, useUser } from '@clerk/clerk-react'

import { createAuth } from '@redwoodjs/auth-clerk-web'
import { navigate } from '@redwoodjs/router'

export const { AuthProvider: ClerkRwAuthProvider, useAuth } = createAuth()

const ClerkStatusUpdater = () => {
  const { isSignedIn, user, isLoaded } = useUser()
  const { reauthenticate } = useAuth()

  useEffect(() => {
    if (isLoaded) {
      reauthenticate()
    }
  }, [isSignedIn, user, reauthenticate, isLoaded])

  return null
}

type ClerkOptions =
  | { publishableKey: string; frontendApi?: never }
  | { publishableKey?: never; frontendApi: string }

interface Props {
  children: React.ReactNode
}

const ClerkProviderWrapper = ({
  children,
  clerkOptions,
}: Props & { clerkOptions: ClerkOptions }) => {
  const { reauthenticate } = useAuth()

  return (
    <ClerkProvider
      {...clerkOptions}
      navigate={(to) => reauthenticate().then(() => navigate(to))}
    >
      {children}
      <ClerkStatusUpdater />
    </ClerkProvider>
  )
}

export const AuthProvider = ({ children }: Props) => {
  const publishableKey = process.env.CLERK_PUBLISHABLE_KEY
  const frontendApi =
    process.env.CLERK_FRONTEND_API_URL || process.env.CLERK_FRONTEND_API

  const clerkOptions: ClerkOptions = publishableKey
    ? { publishableKey }
    : { frontendApi }

  return (
    <ClerkRwAuthProvider>
      <ClerkProviderWrapper clerkOptions={clerkOptions}>
        {children}
      </ClerkProviderWrapper>
    </ClerkRwAuthProvider>
  )
}
