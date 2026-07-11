/*
 This call allows the middleware to validate the cookie and return the current user.
 */
export const getCurrentUserFromMiddleware = async <
  TCurrentUser = Record<string, unknown>,
>(
  authUrl: string,
): Promise<TCurrentUser> => {
  const response = await globalThis.fetch(`${authUrl}/currentUser`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      'content-type': 'application/json',
    },
  })

  if (response.ok) {
    const { currentUser } = await response.json()
    if (!currentUser) {
      throw new Error('No current user found')
    }
    return currentUser
  } else {
    throw new Error(
      `Could not fetch current user: ${response.statusText} (${response.status})`,
    )
  }
}
