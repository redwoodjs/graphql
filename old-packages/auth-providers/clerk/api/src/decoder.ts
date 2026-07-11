import type { Decoder } from '@redwoodjs/api'

/**
 * @deprecated This function will be removed; it uses a rate-limited API. Use `clerkAuthDecoder` instead.
 */
export const authDecoder: Decoder = async (token: string, type: string) => {
  if (type !== 'clerk') {
    return null
  }

  const { users, verifyToken } = await import('@clerk/clerk-sdk-node')

  try {
    const issuer = (iss: string) =>
      iss.startsWith('https://clerk.') || iss.includes('.clerk.accounts')

    const jwtPayload = await verifyToken(token, {
      issuer,
      apiUrl: process.env.CLERK_API_URL || 'https://api.clerk.dev',
      jwtKey: process.env.CLERK_JWT_KEY,
      apiKey: process.env.CLERK_API_KEY,
      secretKey: process.env.CLERK_SECRET_KEY,
    })

    if (!jwtPayload.sub) {
      return Promise.reject(new Error('Session invalid'))
    }

    const user = await users.getUser(jwtPayload.sub)

    return {
      ...user,
      roles: user.publicMetadata['roles'] ?? [],
    }
  } catch (error) {
    console.error(error)
    return Promise.reject(error)
  }
}

export const clerkAuthDecoder: Decoder = async (
  token: string,
  type: string,
) => {
  if (type !== 'clerk') {
    return null
  }

  const { verifyToken } = await import('@clerk/clerk-sdk-node')

  try {
    const issuer = (iss: string) =>
      iss.startsWith('https://clerk.') || iss.includes('.clerk.accounts')

    const jwtPayload = await verifyToken(token, {
      issuer,
      apiUrl: process.env.CLERK_API_URL || 'https://api.clerk.dev',
      jwtKey: process.env.CLERK_JWT_KEY,
      apiKey: process.env.CLERK_API_KEY,
      secretKey: process.env.CLERK_SECRET_KEY,
    })

    if (!jwtPayload.sub) {
      return Promise.reject(new Error('Session invalid'))
    }

    return {
      ...jwtPayload,
      id: jwtPayload.sub,
    }
  } catch (error) {
    console.error(error)
    return Promise.reject(error)
  }
}
