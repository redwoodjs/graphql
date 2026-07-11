import type { APIGatewayEvent, Context as LambdaContext } from 'aws-lambda'

import type { Decoder } from '@redwoodjs/api'
import { getAuthenticationContext } from '@redwoodjs/api'
import type { GlobalContext } from '@redwoodjs/context'
import { context as globalContext } from '@redwoodjs/context'
import { getAsyncStoreInstance } from '@redwoodjs/context/dist/store'

import type { GetCurrentUser } from '../types'

interface Args {
  authDecoder?: Decoder | Decoder[]
  handlerFn: (
    event: APIGatewayEvent,
    context: LambdaContext,
    ...others: any
  ) => any
  getCurrentUser?: GetCurrentUser
}

// Used for type safety in our tests
export type UseRequireAuth = (
  args: Args,
) => (
  event: APIGatewayEvent,
  context: LambdaContext,
  ...rest: any
) => Promise<ReturnType<Args['handlerFn']>>

export const useRequireAuth: UseRequireAuth = ({
  authDecoder,
  handlerFn,
  getCurrentUser,
}) => {
  return async (
    event: APIGatewayEvent,
    context: LambdaContext,
    ...rest: any
  ) => {
    const authEnrichedFunction = async () => {
      try {
        const authContext = await getAuthenticationContext({
          authDecoder,
          event,
          context,
        })

        if (authContext) {
          const currentUser = getCurrentUser
            ? await getCurrentUser(
                authContext[0],
                authContext[1],
                authContext[2],
              )
            : null

          globalContext.currentUser = currentUser
        }
      } catch (e) {
        globalContext.currentUser = null

        if (process.env.NODE_ENV === 'development') {
          console.warn('This warning is only printed in development mode.')
          console.warn(
            "Always make sure to have `requireAuth('role')` inside your own handler function.",
          )
          console.warn('')
          console.warn(e)
        }
      }

      return await handlerFn(event, context, ...rest)
    }

    // This ensures context is scoped to the lifetime of the request
    return getAsyncStoreInstance().run(
      new Map<string, GlobalContext>(),
      authEnrichedFunction,
    )
  }
}
