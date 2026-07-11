import { createServerClient } from '@supabase/ssr'
import jwt from 'jsonwebtoken'

import {
  parseAuthorizationCookie,
  type Decoded,
  type Decoder,
} from '@redwoodjs/api'
import type { AuthorizationCookies } from '@redwoodjs/api'

const ERROR_MESSAGE = `Your project's URL, Key and Secret are required to create a Supabase client!\n\nCheck your Supabase project's API settings to find these values\n\nhttps://supabase.com/dashboard/project/_/settings/api`

export const messageForSupabaseSettingsError = (envar: string) => {
  return `Your project's ${envar} envar is not set. ${ERROR_MESSAGE.replace(/\n/g, ' ')}`
}

export const throwSupabaseSettingsError = (envar: string) => {
  throw new Error(messageForSupabaseSettingsError(envar))
}

/**
 * Creates Supabase Server Client used to get the session cookie (only)
 * from a given collection of auth cookies
 */
const createSupabaseServerClient = (authCookies: AuthorizationCookies) => {
  if (!process.env.SUPABASE_URL) {
    throwSupabaseSettingsError('SUPABASE_URL')
  }

  if (!process.env.SUPABASE_KEY) {
    throwSupabaseSettingsError('SUPABASE_KEY')
  }

  return createServerClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_KEY || '',
    {
      cookies: {
        get(name: string) {
          return authCookies?.parsedCookie?.[name]
        },
      },
    },
  )
}

/**
 * Get the Supabase access token from the cookie using the Supabase SDK and session
 */
const getSupabaseAccessTokenFromCookie = async (
  authCookies: AuthorizationCookies,
) => {
  const supabase = createSupabaseServerClient(authCookies)

  const { data, error } = await supabase.auth.getSession()

  if (!error) {
    const { session } = data
    if (session) {
      return session.access_token
    }
    throw new Error('No Supabase session found')
  } else {
    console.error(error)
    throw error
  }
}

/**
 * Decodes a Supabase JWT with Bearer token or uses createServerClient verify an authenticated cookie header request
 */
export const authDecoder: Decoder = async (
  token: string,
  type: string,
  { event },
) => {
  if (!process.env.SUPABASE_JWT_SECRET) {
    throwSupabaseSettingsError('SUPABASE_JWT_SECRET')
  }
  const secret = process.env.SUPABASE_JWT_SECRET as string

  if (type !== 'supabase') {
    return null
  }

  const authCookies = parseAuthorizationCookie(event)

  // If we have a Supabase auth-provider cookie, then use the SDK to get the access token
  // Otherwise, use the Bearer token provided in the Authorization header
  if (authCookies?.type === 'supabase') {
    token = await getSupabaseAccessTokenFromCookie(authCookies)
  }

  try {
    return jwt.verify(token, secret) as Decoded
  } catch (error) {
    console.error(error)
    throw error
  }
}
