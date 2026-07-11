export type Decoded = Record<string, unknown> | null

interface DecodedWithRoles extends Record<string, unknown> {
  roles: string | string[]
}

interface DecodedWithMetadata extends Record<string, unknown> {
  [key: string]: Record<string, unknown>
}

interface TokenWithRoles {
  decoded: DecodedWithRoles
}

interface TokenWithMetadata {
  decoded: DecodedWithMetadata
  namespace?: string
}

function isTokenWithRoles(token: {
  decoded: Decoded
}): token is TokenWithRoles {
  return !!(token.decoded as DecodedWithRoles)?.roles
}

function isTokenWithMetadata(token: {
  decoded: Decoded
  namespace?: string
}): token is TokenWithMetadata {
  const claim = token.namespace
    ? `${token.namespace}/app_metadata`
    : 'app_metadata'
  return !!(token.decoded as DecodedWithMetadata)?.[claim]
}

const appMetadata = (token: { decoded: Decoded; namespace?: string }): any => {
  if (typeof token.decoded === 'string') {
    return {}
  }

  if (isTokenWithMetadata(token)) {
    const claim = token.namespace
      ? `${token.namespace}/app_metadata`
      : 'app_metadata'
    return token.decoded?.[claim]
  }

  return {}
}

const roles = (token: {
  decoded: Decoded
  namespace?: string
}): string | string[] => {
  if (isTokenWithRoles(token)) {
    return token.decoded.roles
  }

  const metadata = appMetadata(token)
  return metadata?.roles || metadata.authorization?.roles || []
}

export const parseJWT = (token: {
  decoded: Decoded
  namespace?: string
}): any => {
  return {
    appMetadata: appMetadata(token),
    roles: roles(token),
  }
}
