import type { APIGatewayEvent, Context } from 'aws-lambda'
import jwt from 'jsonwebtoken'
import { describe, expect, it } from 'vitest'

import { AuthenticationError } from '../../errors'
import type { UseRequireAuth } from '../useRequireAuth'

import { getCurrentUser } from './fixtures/auth'

type RedwoodUser = Record<string, unknown> & { roles?: string[] }

export const mockedAuthenticationEvent = ({
  headers = {},
}: {
  headers: Record<string, any> | null | undefined
}): APIGatewayEvent => {
  return {
    body: 'MOCKED_BODY',
    headers: headers || {},
    multiValueHeaders: {},
    httpMethod: 'POST',
    isBase64Encoded: false,
    path: '/MOCK_PATH',
    pathParameters: null,
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {
      accountId: 'MOCKED_ACCOUNT',
      apiId: 'MOCKED_API_ID',
      authorizer: { name: 'MOCKED_AUTHORIZER' },
      protocol: 'HTTP',
      identity: {
        accessKey: null,
        accountId: null,
        apiKey: null,
        apiKeyId: null,
        caller: null,
        clientCert: null,
        cognitoAuthenticationProvider: null,
        cognitoAuthenticationType: null,
        cognitoIdentityId: null,
        cognitoIdentityPoolId: null,
        principalOrgId: null,
        sourceIp: '123.123.123.123',
        user: null,
        userAgent: null,
        userArn: null,
      },
      httpMethod: 'POST',
      path: '/MOCK_PATH',
      stage: 'MOCK_STAGE',
      requestId: 'MOCKED_REQUEST_ID',
      requestTimeEpoch: 1,
      resourceId: 'MOCKED_RESOURCE_ID',
      resourcePath: 'MOCKED_RESOURCE_PATH',
    },
    resource: 'MOCKED_RESOURCE',
  }
}

const handler = async (
  _event: APIGatewayEvent,
  _context: Context,
): Promise<any> => {
  // @MARK
  // Don't use globalContext until beforeAll runs
  const globalContext = (await import('@redwoodjs/context')).context
  const currentUser = globalContext.currentUser

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ currentUser: currentUser || 'NO_CURRENT_USER' }),
  }
}

const handlerWithAuthChecks = async (
  _event: APIGatewayEvent,
  _context: Context,
): Promise<unknown> => {
  // TODO: Add requireAuth('role') here
  // or isAuthenticated()

  const { hasRole, isAuthenticated, requireAuth } = await import(
    './fixtures/auth'
  )

  const body = {
    message: '',
  }

  if (!isAuthenticated()) {
    body.message = 'Not authenticated'
  } else if (hasRole('admin')) {
    body.message = 'User is an admin'
  } else {
    requireAuth({ roles: 'editor' })

    body.message = 'User is an editor'
  }

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  }
}

const handlerWithError = async (
  _event: APIGatewayEvent,
  _context: Context,
): Promise<any> => {
  // @MARK
  // Don't use globalContext until beforeAll runs
  const globalContext = (await import('@redwoodjs/context')).context
  const currentUser = globalContext.currentUser

  try {
    throw new AuthenticationError('An error occurred in the handler')

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(currentUser),
    }
  } catch (error) {
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ error: error.message }),
    }
  }
}

const getCurrentUserWithError = async (
  _decoded,
  { token: _token },
): Promise<RedwoodUser> => {
  throw Error('Something went wrong getting the user info')
}

describe('useRequireAuth', () => {
  it('Updates context with output of current user', async () => {
    // @MARK
    // Because we use context inside useRequireAuth, we only want to import this function
    // once we disable context isolation for our test
    const { useRequireAuth }: { useRequireAuth: UseRequireAuth } = await import(
      '../useRequireAuth'
    )

    const handlerEnrichedWithAuthentication = useRequireAuth({
      handlerFn: handler,
      getCurrentUser,
      authDecoder: async (
        token: string,
        _type: string,
        _req: { event: APIGatewayEvent; context: Context },
      ) => {
        return { token }
      },
    })

    const headers = {
      'auth-provider': 'custom',
      authorization: 'Bearer myToken',
    }

    const output = await handlerEnrichedWithAuthentication(
      mockedAuthenticationEvent({ headers }),
      {} as Context,
    )

    const response = JSON.parse(output.body)
    expect(response.currentUser.token).toEqual('myToken')
  })

  it('Updates context with output of current user with roles', async () => {
    // @MARK
    // Because we use context inside useRequireAuth, we only want to import this function
    // once we disable context isolation for our test
    const { useRequireAuth }: { useRequireAuth: UseRequireAuth } = await import(
      '../useRequireAuth'
    )

    const handlerEnrichedWithAuthentication = useRequireAuth({
      handlerFn: handler,
      getCurrentUser,
      authDecoder: async (
        token: string,
        _type: string,
        _req: { event: APIGatewayEvent; context: Context },
      ) => {
        return jwt.decode(token) as Record<string, any>
      },
    })

    // The authorization JWT is valid and has roles in app metadata
    // {
    //   "sub": "1234567891",
    //   "name": "John Editor",
    //   "iat": 1516239022,
    //   "app_metadata": {
    //      "roles": ["editor"]
    //   }
    // }
    const headersWithRoles = {
      'auth-provider': 'netlify',
      authorization:
        'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkxIiwibmFtZSI6IkpvaG4gRWRpdG9yIiwiaWF0IjoxNTE2MjM5MDIyLCJhcHBfbWV0YWRhdGEiOnsicm9sZXMiOlsiZWRpdG9yIl19fQ.Fhxe58-7BcjJDoYQAZluJYGwPTPLU0x6K5yA3zXKaX8',
    }

    const output = await handlerEnrichedWithAuthentication(
      mockedAuthenticationEvent({ headers: headersWithRoles }),
      {} as Context,
    )

    const response = JSON.parse(output.body)
    expect(response.currentUser.name).toEqual('John Editor')
    expect(response.currentUser.roles).toContain('editor')
  })

  it('is 200 status if an error occurs when getting current user info', async () => {
    const { useRequireAuth }: { useRequireAuth: UseRequireAuth } = await import(
      '../useRequireAuth'
    )

    const handlerEnrichedWithAuthentication = useRequireAuth({
      handlerFn: handler,
      getCurrentUser: getCurrentUserWithError,
    })

    const customHeaders = {
      'auth-provider': 'custom',
      authorization: 'Bearer myToken',
    }

    const output = await handlerEnrichedWithAuthentication(
      mockedAuthenticationEvent({ headers: customHeaders }),
      {} as Context,
    )

    expect(output.statusCode).toEqual(200)
    const response = JSON.parse(output.body)
    expect(response.currentUser).toEqual('NO_CURRENT_USER')
  })

  it('is 200 status if no auth headers present', async () => {
    const { useRequireAuth }: { useRequireAuth: UseRequireAuth } = await import(
      '../useRequireAuth'
    )

    const handlerEnrichedWithAuthentication = useRequireAuth({
      handlerFn: handler,
      getCurrentUser,
      authDecoder: async (
        _token: string,
        _type: string,
        _req: { event: APIGatewayEvent; context: Context },
      ) => {
        return null
      },
    })

    const missingHeaders = null

    const output = await handlerEnrichedWithAuthentication(
      mockedAuthenticationEvent({ headers: missingHeaders }),
      {} as Context,
    )

    expect(output.statusCode).toEqual(200)
    const response = JSON.parse(output.body)
    expect(response.currentUser).toEqual('NO_CURRENT_USER')
  })

  it('is 200 status with token if the auth provider is unsupported', async () => {
    const { useRequireAuth }: { useRequireAuth: UseRequireAuth } = await import(
      '../useRequireAuth'
    )

    const handlerEnrichedWithAuthentication = useRequireAuth({
      handlerFn: handler,
      getCurrentUser,
      authDecoder: async (
        token: string,
        _type: string,
        _req: { event: APIGatewayEvent; context: Context },
      ) => {
        return { token }
      },
    })

    const unsupportedProviderHeaders = {
      'auth-provider': 'this-auth-provider-is-unsupported',
      authorization: 'Basic myToken',
    }

    const response = await handlerEnrichedWithAuthentication(
      mockedAuthenticationEvent({ headers: unsupportedProviderHeaders }),
      {} as Context,
    )

    const body = JSON.parse(response.body)

    expect(response.statusCode).toEqual(200)
    expect(body.currentUser.token).toEqual('myToken')
  })

  it('returns 200 if decoding JWT succeeds for netlify', async () => {
    const { useRequireAuth }: { useRequireAuth: UseRequireAuth } = await import(
      '../useRequireAuth'
    )

    const handlerEnrichedWithAuthentication = useRequireAuth({
      handlerFn: handler,
      getCurrentUser,
      authDecoder: async (
        token: string,
        _type: string,
        _req: { event: APIGatewayEvent; context: Context },
      ) => {
        return jwt.decode(token) as Record<string, any>
      },
    })

    // Note: The Bearer token JWT contains:
    // {
    //   "sub": "1234567890",
    //   "name": "John Doe",
    //   "iat": 1516239022
    // }

    const netlifyJWTHeaders = {
      'auth-provider': 'netlify',
      authorization:
        'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
    }

    const response = await handlerEnrichedWithAuthentication(
      mockedAuthenticationEvent({ headers: netlifyJWTHeaders }),
      {} as Context,
    )

    const body = JSON.parse(response.body)

    expect(response.statusCode).toEqual(200)
    expect(body.currentUser.sub).toEqual('1234567890')
    expect(body.currentUser.name).toEqual('John Doe')
  })

  it('is 200 status if decoding JWT fails for netlify', async () => {
    const { useRequireAuth }: { useRequireAuth: UseRequireAuth } = await import(
      '../useRequireAuth'
    )

    const handlerEnrichedWithAuthentication = useRequireAuth({
      handlerFn: handler,
      getCurrentUser,
    })

    const invalidJWTHeaders = {
      'auth-provider': 'netlify',
      authorization: 'Bearer this-is-an-invalid-jwt',
    }

    const response = await handlerEnrichedWithAuthentication(
      mockedAuthenticationEvent({ headers: invalidJWTHeaders }),
      {} as Context,
    )

    const body = JSON.parse(response.body)

    expect(response.statusCode).toEqual(200)
    expect(body.currentUser).toEqual('NO_CURRENT_USER')
  })

  it('is 200 status if decoding JWT fails for supabase', async () => {
    const { useRequireAuth }: { useRequireAuth: UseRequireAuth } = await import(
      '../useRequireAuth'
    )

    const handlerEnrichedWithAuthentication = useRequireAuth({
      handlerFn: handler,
      getCurrentUser,
    })

    const invalidJWTHeaders = {
      'auth-provider': 'supabase',
      authorization: 'Bearer this-is-an-invalid-jwt',
    }

    const response = await handlerEnrichedWithAuthentication(
      mockedAuthenticationEvent({ headers: invalidJWTHeaders }),
      {} as Context,
    )

    const body = JSON.parse(response.body)

    expect(response.statusCode).toEqual(200)
    expect(body.currentUser).toEqual('NO_CURRENT_USER')
  })

  it('is 500 Server Error status if handler errors', async () => {
    const { useRequireAuth }: { useRequireAuth: UseRequireAuth } = await import(
      '../useRequireAuth'
    )

    const customHeaders = {
      'auth-provider': 'custom',
      authorization: 'Bearer myToken',
    }

    const handlerEnrichedWithAuthentication = useRequireAuth({
      handlerFn: handlerWithError,
      getCurrentUser,
    })

    const response = await handlerEnrichedWithAuthentication(
      mockedAuthenticationEvent({ headers: customHeaders }),
      {} as Context,
    )

    const message = JSON.parse(response.body).error

    expect(response.statusCode).toEqual(500)
    expect(message).toEqual('An error occurred in the handler')
  })

  it('enables the use of auth functions inside the handler to check that isAuthenticated blocks unauthenticated users', async () => {
    const { useRequireAuth }: { useRequireAuth: UseRequireAuth } = await import(
      '../useRequireAuth'
    )

    const netlifyJWTHeaders = {
      'auth-provider': 'netlify',
      authorization: 'Bearer eyJhbGciOi.eyJzdWI.Sfl_expired_token',
    }

    const handlerEnrichedWithAuthentication = useRequireAuth({
      handlerFn: handlerWithAuthChecks,
      getCurrentUser,
    })

    const response = await handlerEnrichedWithAuthentication(
      mockedAuthenticationEvent({ headers: netlifyJWTHeaders }),
      {} as Context,
    )

    const body = JSON.parse(response.body)

    expect(response.statusCode).toEqual(200)
    expect(body.message).toEqual('Not authenticated')
  })

  it("enables the use of auth functions inside the handler to check that requireAuth throws if the user doesn't have the required role", async () => {
    const { useRequireAuth }: { useRequireAuth: UseRequireAuth } = await import(
      '../useRequireAuth'
    )

    // Note: The Bearer token JWT contains:
    // {
    //   "sub": "1234567890",
    //   "name": "John Doe",
    //   "iat": 1516239022
    // }

    const netlifyJWTHeaders = {
      'auth-provider': 'netlify',
      authorization:
        'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
    }

    const handlerEnrichedWithAuthentication = useRequireAuth({
      handlerFn: handlerWithAuthChecks,
      getCurrentUser,
      authDecoder: async (
        token: string,
        _type: string,
        _req: { event: APIGatewayEvent; context: Context },
      ) => {
        return jwt.decode(token) as Record<string, any>
      },
    })

    await expect(
      handlerEnrichedWithAuthentication(
        mockedAuthenticationEvent({ headers: netlifyJWTHeaders }),
        {} as Context,
      ),
    ).rejects.toThrow("You don't have access to do that.")
  })

  it('enables the use of auth functions inside the handler to check editor role', async () => {
    const { useRequireAuth }: { useRequireAuth: UseRequireAuth } = await import(
      '../useRequireAuth'
    )

    // The authorization JWT is valid and has roles in app metadata
    // {
    //   "sub": "1234567891",
    //   "name": "John Editor",
    //   "iat": 1516239022,
    //   "app_metadata": {
    //      "roles": ["editor"]
    //   }
    // }
    const headersWithRoles = {
      'auth-provider': 'netlify',
      authorization:
        'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkxIiwibmFtZSI6IkpvaG4gRWRpdG9yIiwiaWF0IjoxNTE2MjM5MDIyLCJhcHBfbWV0YWRhdGEiOnsicm9sZXMiOlsiZWRpdG9yIl19fQ.Fhxe58-7BcjJDoYQAZluJYGwPTPLU0x6K5yA3zXKaX8',
    }

    const handlerEnrichedWithAuthentication = useRequireAuth({
      handlerFn: handlerWithAuthChecks,
      getCurrentUser,
      authDecoder: async (
        token: string,
        _type: string,
        _req: { event: APIGatewayEvent; context: Context },
      ) => {
        return jwt.decode(token) as Record<string, any>
      },
    })

    const response = await handlerEnrichedWithAuthentication(
      mockedAuthenticationEvent({ headers: headersWithRoles }),
      {} as Context,
    )

    const body = JSON.parse(response.body)

    expect(response.statusCode).toEqual(200)
    expect(body.message).toEqual('User is an editor')
  })
})
