import url from 'node:url'

import * as DefaultFetchAPI from '@whatwg-node/fetch'
import { normalizeNodeRequest } from '@whatwg-node/server'
import busboy from 'busboy'
import type {
  Request as ExpressRequest,
  Response as ExpressResponse,
} from 'express'
import type Router from 'find-my-way'
import type { HTTPMethod } from 'find-my-way'
import type { ViteDevServer } from 'vite'

import { getPaths } from '@redwoodjs/project-config'

import {
  decodeReply,
  decodeReplyFromBusboy,
} from '../bundled/react-server-dom-webpack.server'
import { hasStatusCode } from '../lib/StatusError.js'
import type { Middleware } from '../middleware'
import { invoke } from '../middleware/invokeMiddleware'
import { getAuthState, getRequestHeaders } from '../serverStore'
import type { RWRouteManifest } from '../types'

import { sendRscFlightToStudio } from './rscStudioHandlers.js'
import { renderRsc } from './rscWorkerCommunication.js'

interface CreateRscRequestHandlerOptions {
  getMiddlewareRouter: () => Promise<Router.Instance<any>>
  viteDevServer?: ViteDevServer
}

const BASE_PATH = '/rw-rsc/'

export function createRscRequestHandler(
  options: CreateRscRequestHandlerOptions,
) {
  // This is mounted at /rw-rsc, so will have /rw-rsc stripped from req.url

  // above this line is for ALL users ☝️, not a per request basis
  // -------------
  return async (
    req: ExpressRequest,
    res: ExpressResponse,
    next: () => void,
  ) => {
    const requestUrl = getRSCRequestUrl(req)

    // find the Route from the request based on the url
    // can use the route to determine if the RSC request to render is private or not
    if (!(await isRequestAllowed(req))) {
      console.log('Request is not allowed')
      // throw 401?
    }

    // if we are here then we can render the RSC
    const mwRouter = await options.getMiddlewareRouter()

    if (mwRouter) {
      // @MARK: Temporarily create Fetch Request here.
      // Ideally we'll have converted this whole handler to be Fetch Req and Response
      const webReq = normalizeNodeRequest(req, DefaultFetchAPI.Request)
      const matchedMw = mwRouter.find(webReq.method as HTTPMethod, webReq.url)

      const [mwResponse] = await invoke(
        webReq,
        matchedMw?.handler as Middleware | undefined,
        {
          params: matchedMw?.params,
          viteDevServer: options.viteDevServer,
        },
      )

      const webRes = mwResponse.toResponse()

      // @MARK: Grab the headers from MWResponse and set them on the Express Response
      // @TODO This is a temporary solution until we can convert this entire handler to use Fetch API
      // This WILL not handle multiple Set-Cookie headers correctly. Proper Fetch-Response support will resolve this.
      webRes.headers.forEach((value, key) => {
        res.setHeader(key, value)
      })

      if (mwResponse.isRedirect() || mwResponse.body) {
        // We also don't know what the Router will do if this RSC handler fails at any point
        // Whatever that behavior is, this should match.
        throw new Error(
          'Not Implemented: What should happen if this RSC handler fails? And which part - Client side router?',
        )
      }
    }

    // https://www.rfc-editor.org/rfc/rfc6648
    // "SHOULD NOT prefix their parameter names with "X-" or similar constructs."
    if (req.headers['rw-rsc'] !== '1') {
      return next()
    }

    let rscId: string | undefined
    let props = {}
    let rsfId: string | undefined
    let args: unknown[] = []

    if (requestUrl.pathname.startsWith(BASE_PATH)) {
      console.log('url.pathname', requestUrl.pathname)
      rscId = requestUrl.pathname.split('/').pop()
      rsfId = requestUrl.searchParams.get('action_id') || undefined

      console.log('rscId', rscId)
      console.log('rsfId', rsfId)

      if (rscId && rscId !== '_') {
        res.setHeader('Content-Type', 'text/x-component')
        props = JSON.parse(requestUrl.searchParams.get('props') || '{}')
      } else {
        rscId = undefined
      }

      if (rsfId) {
        // TODO (RSC): For React Server Actions we need to limit the request
        // size somehow
        // https://nextjs.org/docs/app/api-reference/functions/server-actions#size-limitation
        if (req.headers['content-type']?.startsWith('multipart/form-data')) {
          console.log('RSA: multipart/form-data')
          const bb = busboy({ headers: req.headers })
          // TODO (RSC): The generic here could be typed better
          const reply = decodeReplyFromBusboy<unknown[]>(bb)

          req.pipe(bb)
          args = await reply

          // TODO (RSC): Loop over args (to not only look at args[0])
          // TODO (RSC): Verify that this works with node16 (MDN says FormData is
          // only supported in node18 and up)
          if (args[0] instanceof FormData) {
            const serializedFormData: Record<string, any> = {}

            for (const [key, value] of args[0]) {
              // Several form fields can share the same name. This should be
              // represented as an array of the values of all those fields
              if (serializedFormData[key] !== undefined) {
                if (!Array.isArray(serializedFormData[key])) {
                  serializedFormData[key] = [serializedFormData[key]]
                }

                serializedFormData[key].push(value)
              } else {
                serializedFormData[key] = value
              }
            }

            args[0] = {
              __formData__: true,
              state: serializedFormData,
            }
          }
        } else {
          console.log('RSA: regular body')
          let body = ''

          for await (const chunk of req) {
            body += chunk
          }

          if (body) {
            args = await decodeReply(body)
          }
        }
      }
    }

    console.log('rscRequestHandler: args', args)

    if (rscId || rsfId) {
      const handleError = (err: unknown) => {
        if (hasStatusCode(err)) {
          res.statusCode = err.statusCode
        } else {
          console.info('Cannot render RSC', err)
          res.statusCode = 500
        }

        // Getting a warning on GitHub about this
        // https://github.com/redwoodjs/redwood/security/code-scanning/211
        // Handle according to TODO below
        res.end(String(err))
        // TODO (RSC): When we have `yarn rw dev` support we should do this:
        // if (options.command === 'dev') {
        //   res.end(String(err))
        // } else {
        //   res.end()
        // }
      }

      try {
        const pipeable = await renderRsc({
          rscId,
          props,
          rsfId,
          args,
          // Pass the serverState from server to the worker
          // Inside the worker, we'll use this to re-initalize the server state (because workers are stateless)
          serverState: {
            headersInit: Object.fromEntries(getRequestHeaders().entries()),
            serverAuthState: getAuthState(),
          },
        })

        await sendRscFlightToStudio({
          rscId,
          props,
          rsfId,
          args,
          basePath: BASE_PATH,
          req,
          handleError,
        })

        // TODO (RSC): See if we can/need to do more error handling here
        // pipeable.on(handleError)

        pipeable.pipe(res)
      } catch (e) {
        handleError(e)
      }
    }
  }
}

const isRequestAllowed = async (req: ExpressRequest) => {
  const matchedRoute = await matchRouteFromRequest(req)

  //@TODO
  // if matchedRoute isPrivate, and user is not logged in then we should not render the RSC
  console.log('>>>>>>>>>> matchedRoute', matchedRoute)
  // if (matchedRoute.isPrivate) {
  // @TODO
  // if user is not logged in then we should not render the RSC
  // we should return a 401
  // check roles
  // get roles from auth state anf check if user has the role
  // }

  // also, should probably check if rscId is in the route manifest
  // so you cannot pick a route you can access nd RscId maybe you cannot access
  // we'd add the route page_identifier_str or const to the manifest

  const isAllowed = matchedRoute ? true : false
  console.log('isRequestAllowed', isAllowed, matchedRoute)
  // for now
  return isAllowed
}

const matchRouteFromRequest = async (req: ExpressRequest) => {
  // A RSC request looks like:
  // http://localhost:8910/<routePath>/AboutPage?props=%7B%7D
  // and headers['rw-rsc'] === '1'
  // let's extract the routePath to use it to look up the route in the route manifest
  const requestUrl = getRSCRequestUrl(req)
  const routePath = getRoutePath(requestUrl)

  // here we can look up the route in the route manifest by the route path
  // given paths are unique (TODO need to enforce this)
  // then the consider auth rules is isPrivate to determine if we should
  // run the render the RSC or not
  const routeManifest: RWRouteManifest = await getRouteManifest()

  const matchedRoute = Object.values(routeManifest).find(
    (r) =>
      r.pathDefinition === routePath || r.pathDefinition === '/' + routePath,
  )

  if (!matchedRoute) {
    console.warn('No route found for', routePath)

    // throw 404?
  }

  return matchedRoute
}

const getRoutePath = (requestUrl: URL) => {
  let routePath = requestUrl.pathname.split('/').reverse()[1]
  if (routePath === BASE_PATH || routePath === '') {
    console.warn('No routePath found, setting to /')
    routePath = '/'
  }
  return routePath
}

const getRouteManifest = async (): Promise<RWRouteManifest> => {
  // to do: this should be cached or preloaded to avoid reading the file every time
  const rwPaths = getPaths()
  const routeManifestUrl = url.pathToFileURL(rwPaths.web.routeManifest).href
  const routeManifest: RWRouteManifest = (
    await import(routeManifestUrl, { with: { type: 'json' } })
  ).default
  return routeManifest
}

const getRSCRequestUrl = (req: ExpressRequest) => {
  return new URL(req.originalUrl || '', 'http://' + req.headers.host)
}
