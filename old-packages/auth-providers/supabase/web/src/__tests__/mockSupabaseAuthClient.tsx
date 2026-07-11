import type {
  SupabaseClient,
  User,
  AuthResponse,
  OAuthResponse,
  SSOResponse,
  SignInWithOAuthCredentials,
  SignInWithIdTokenCredentials,
  SignInWithPasswordlessCredentials,
  SignInWithSSO,
  SignInWithPasswordCredentials,
  SignUpWithPasswordCredentials,
  Session,
  AuthOtpResponse,
  AuthTokenResponse,
  AuthSession,
  AuthTokenResponsePassword,
} from '@supabase/supabase-js'
import { AuthError } from '@supabase/supabase-js'

const user: User = {
  id: 'unique_user_id',
  aud: 'authenticated',
  user_metadata: {
    full_name: 'John Doe',
  },
  email: 'john.doe@example.com',
  app_metadata: {
    provider: 'supabase',
    roles: ['user'],
  },
  created_at: new Date().toUTCString(),
}
export const adminUser: User = {
  id: 'unique_user_id_admin',
  aud: 'authenticated',
  user_metadata: {
    full_name: 'Mr Smith',
  },
  email: 'admin@example.com',
  app_metadata: {
    provider: 'supabase',
    roles: ['user', 'admin'],
  },
  created_at: new Date().toUTCString(),
}
const oAuthUser: User = {
  id: 'unique_user_id',
  aud: 'authenticated',
  user_metadata: {
    full_name: 'Octo Cat',
  },
  email: 'octo.cat@example.com',
  app_metadata: {
    provider: 'github',
    roles: ['user'],
  },
  created_at: new Date().toUTCString(),
}

export let loggedInUser: User

export const mockSupabaseAuthClient: Partial<SupabaseClient['auth']> & {
  __testOnly__setMockUser: (user: User | null) => void
} = {
  signInWithPassword: async (
    credentials: SignInWithPasswordCredentials,
  ): Promise<AuthTokenResponsePassword> => {
    const { email } = credentials as { email: string }

    loggedInUser = email === 'admin@example.com' ? adminUser : user

    loggedInUser.email = email
    const session: AuthSession = {
      access_token: `token ${credentials.token}`,
      refresh_token: 'refresh_token_1234567890',
      token_type: `Bearer ${credentials.provider}`,
      expires_in: 999,
      user: loggedInUser,
    }

    return {
      data: {
        user: loggedInUser,
        session,
      },
      error: null,
    }
  },
  signInWithOAuth: async (
    credentials: SignInWithOAuthCredentials,
  ): Promise<OAuthResponse> => {
    loggedInUser = oAuthUser

    return {
      data: {
        provider: credentials.provider,
        url: `https://${credentials.provider}.com`,
      },
      error: null,
    }
  },
  signInWithOtp: async (
    credentials: SignInWithPasswordlessCredentials,
  ): Promise<AuthOtpResponse> => {
    loggedInUser = user
    loggedInUser.email = credentials['email']

    return {
      data: {
        user: null,
        session: null,
      },
      error: null,
    }
  },

  signInWithIdToken: async (
    credentials: SignInWithIdTokenCredentials,
  ): Promise<AuthTokenResponse> => {
    loggedInUser = user

    const session: AuthSession = {
      access_token: `token ${credentials.token}`,
      refresh_token: 'refresh_token_1234567890',
      token_type: `Bearer ${credentials.provider}`,
      expires_in: 999,
      user: loggedInUser,
    }
    loggedInUser.app_metadata = session

    return {
      data: {
        user: loggedInUser,
        session,
      },
      error: null,
    }
  },
  signInWithSSO: async (credentials: SignInWithSSO): Promise<SSOResponse> => {
    loggedInUser = user

    const url = `https://${credentials['domain']}.${credentials['providerId']}.com`

    loggedInUser.app_metadata = {
      url,
      domain: credentials['domain'],
      providerId: credentials['providerId'],
    }

    return {
      data: {
        url,
      },
      error: null,
    }
  },
  signOut: async () => {
    // @ts-expect-error Resetting the mocked loggedInUser here
    loggedInUser = undefined

    return { error: null }
  },
  signUp: async (
    credentials: SignUpWithPasswordCredentials,
  ): Promise<AuthResponse> => {
    const { email } = credentials as {
      email: string
    }

    loggedInUser = email === 'admin@example.com' ? adminUser : user

    loggedInUser.email = email

    if (credentials.options) {
      loggedInUser.user_metadata = credentials.options
    }

    const session: AuthSession = {
      access_token: `token ${credentials.token}`,
      refresh_token: 'refresh_token_1234567890',
      token_type: `Bearer ${credentials.provider}`,
      expires_in: 999,
      user: loggedInUser,
    }

    return {
      data: {
        user: loggedInUser,
        session: session,
      },
      error: null,
    }
  },
  getSession: async (): Promise<
    | {
        data: {
          session: Session
        }
        error: null
      }
    | {
        data: {
          session: null
        }
        error: AuthError
      }
    | {
        data: {
          session: null
        }
        error: null
      }
  > => {
    if (loggedInUser) {
      return {
        data: {
          session: {
            access_token: 'token',
            refresh_token: 'token',
            expires_in: 999,
            token_type: 'Bearer',
            user: loggedInUser,
          },
        },
        error: null,
      }
    }

    return {
      data: { session: null },
      error: new AuthError('Not logged in'),
    }
  },
  refreshSession: async (currentSession?: {
    refresh_token: string
  }): Promise<AuthResponse> => {
    if (loggedInUser) {
      return {
        data: {
          user: loggedInUser,
          session: {
            access_token: 'jwt_1234567890',
            refresh_token: `refresh_token_1234567890_${currentSession?.refresh_token}`,
            expires_in: 999,
            token_type: 'Bearer',
            user: loggedInUser,
          },
        },
        error: null,
      }
    }

    return {
      data: { user: null, session: null },
      error: new AuthError('Not logged in'),
    }
  },
  __testOnly__setMockUser: (user) => {
    // @ts-expect-error To reset the mocks, we send user as null in tests
    loggedInUser = user
  },
}
