import type { ServerAuthState } from '@redwoodjs/auth/dist/AuthProvider/ServerAuthProvider.js'
import { setServerAuthState } from '@redwoodjs/server-store'
import {
  MiddlewareResponse,
  MiddlewareRequest,
  MiddlewareShortCircuit,
} from '@redwoodjs/web/dist/server/middleware'
import type {
  Middleware,
  MiddlewareInvokeOptions,
} from '@redwoodjs/web/middleware'

/**
 * Invokes the middleware function, and guarantees a MiddlewareResponse object
 * is returned (also making sure that the eventual Response will be of
 * type PonyResponse)
 *
 * Returns promise that will resolve to a tuple of
 * [MiddlewareResponse, ServerAuthState]
 * and will always make sure there is a ServerAuthState set
 */
export const invoke = async (
  req: Request,
  middleware?: Middleware,
  options?: MiddlewareInvokeOptions,
): Promise<[MiddlewareResponse, ServerAuthState]> => {
  const mwReq = new MiddlewareRequest(req)

  if (typeof middleware !== 'function') {
    setServerAuthState(mwReq.serverAuthState.get())

    return [MiddlewareResponse.next(), mwReq.serverAuthState.get()]
  }

  let mwRes: MiddlewareResponse = MiddlewareResponse.next()

  try {
    const output =
      (await middleware(mwReq, MiddlewareResponse.next(), options)) ||
      MiddlewareResponse.next()

    // Error out early, incase user returns something else from the middleware
    // Returning nothing is still fine!
    // if (output instanceof MiddlewareResponse) {
    mwRes = output
    // } else {
    //   console.error('Return from middleware >> ', output)
    //   console.error('\n----\n')
    //   throw new Error(
    //     'Invalid return type from middleware. You must return a ' +
    //       'MiddlewareResponse or nothing at all',
    //   )
    // }
  } catch (e) {
    // A short-circuit will prevent execution of all other middleware down the chain,
    // and prevent react rendering
    if (e instanceof MiddlewareShortCircuit) {
      return [e.mwResponse, mwReq.serverAuthState.get()]
    }

    console.error('Error executing middleware > \n')
    console.error('~'.repeat(80))
    console.error(e)
    console.error('~'.repeat(80))
  } finally {
    // This one is for the server. The worker serverStore is initialized in the worker itself!
    setServerAuthState(mwReq.serverAuthState.get())
  }

  return [mwRes, mwReq.serverAuthState.get()]
}
