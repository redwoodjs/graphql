import admin from 'firebase-admin'

import { AuthenticationError } from '@redwoodjs/graphql-server'

// eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
const adminApp = admin.initializeApp({
  projectId: process.env.FIREBASE_PROJECT_ID,
})

/**
 * getCurrentUser returns the user information from the decoded JWT
 *
 * @param decoded - The decoded access token containing user info and JWT claims like `sub`. Note could be null.
 * @param { token, SupportedAuthTypes type } - The access token itself as well as the auth provider type
 * @param { APIGatewayEvent event, Context context } - An object which contains information from the invoker
 * such as headers and cookies, and the context information about the invocation such as IP Address
 *
 * !! BEWARE !! Anything returned from this function will be available to the
 * client--it becomes the content of `currentUser` on the web side (as well as
 * `context.currentUser` on the api side). You should carefully add additional
 * fields to the return object only once you've decided they are safe to be seen
 * if someone were to open the Web Inspector in their browser.
 *
 * @see https://github.com/redwoodjs/redwood/tree/main/packages/auth for examples
 */
export const getCurrentUser = async (
  decoded,
  /* eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars */
  { token, type },
  /* eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars */
  { event, context }
) => {
  return decoded
}

/**
 * The user is authenticated if there is a currentUser in the context
 *
 * @returns {boolean} - If the currentUser is authenticated
 */
export const isAuthenticated = (): boolean => {
  return !!context.currentUser
}

/**
 * Call requireAuth in your services, or use the @requireAuth directive to check that a user is logged in,
 * and raise an error if they're not.
 *
 * @returns - If the currentUser is authenticated
 *
 * @throws {@link AuthenticationError} - If the currentUser is not authenticated
 *
 * @see https://github.com/redwoodjs/redwood/tree/main/packages/auth for examples
 */
export const requireAuth = () => {
  if (!isAuthenticated()) {
    throw new AuthenticationError("You don't have permission to do that.")
  }

  // Custom RBAC implementation required for firebase
  // https://firebase.google.com/docs/auth/admin/custom-claims
}
