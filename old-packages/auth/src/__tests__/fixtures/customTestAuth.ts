import { CurrentUser, createAuthentication } from '../../index.js'

interface User {
  sub: string
  email?: string
  username?: string
}

export interface ValidateResetTokenResponse {
  error?: string
  [key: string]: string | undefined
}

export interface CustomTestAuthClient {
  login: () => boolean
  logout: () => void
  signup: () => void
  getToken: () => string | null
  getUserMetadata: () => User | null
  forgotPassword: (username: string) => void
  resetPassword: (password: string) => boolean
  validateResetToken: (resetToken: string | null) => ValidateResetTokenResponse
}

export function createCustomTestAuth(
  customTest: CustomTestAuthClient,
  customProviderHooks?: {
    useCurrentUser?: () => Promise<CurrentUser>
    useHasRole?: (
      currentUser: CurrentUser | null
    ) => (rolesToCheck: string | string[]) => boolean
  }
) {
  const authImplementation = createCustomTestAuthImplementation(customTest)

  return createAuthentication(authImplementation, customProviderHooks)
}

function createCustomTestAuthImplementation(
  customTest: CustomTestAuthClient
) {
  return {
    type: 'custom-test',
    client: customTest,
    login: async () => customTest.login(),
    logout: async () => customTest.logout(),
    signup: async () => customTest.signup(),
    getToken: async () => customTest.getToken(),
    /**
     * Actual user metadata might look something like this
     * {
     *   "id": "11111111-2222-3333-4444-5555555555555",
     *   "aud": "authenticated",
     *   "role": "authenticated",
     *   "email": "email@example.com",
     *   "app_metadata": {
     *     "provider": "email"
     *   },
     *   "user_metadata": null,
     *   "created_at": "2016-05-15T19:53:12.368652374-07:00",
     *   "updated_at": "2016-05-15T19:53:12.368652374-07:00"
     * }
     */
    getUserMetadata: async () => customTest.getUserMetadata(),
    forgotPassword: async (username: string) =>
      customTest.forgotPassword(username),
    resetPassword: async (password: string) =>
      customTest.resetPassword(password),
    validateResetToken: async (resetToken: string | null) =>
      customTest.validateResetToken(resetToken),
  }
}
