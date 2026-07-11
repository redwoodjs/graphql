import path from 'path'

import { Response } from '@whatwg-node/fetch'
import type Router from 'find-my-way'
import type { HTTPMethod } from 'find-my-way'
import { createIsbotFromList, list as isbotList } from 'isbot'
import type { ViteDevServer } from 'vite'

import { middlewareDefaultAuthProviderState } from '@redwoodjs/auth/dist/AuthProvider/AuthProviderState.js'
import type { ServerAuthState } from '@redwoodjs/auth/dist/AuthProvider/ServerAuthProvider.js'
import type { RouteSpec, RWRouteManifestItem } from '@redwoodjs/internal'
import { getAppRouteHook, getConfig, getPaths } from '@redwoodjs/project-config'
import { matchPath } from '@redwoodjs/router/util'
import type { TagDescriptor } from '@redwoodjs/web'
import { MiddlewareResponse } from '@redwoodjs/web/middleware'
import type { Middleware } from '@redwoodjs/web/middleware'

import { invoke } from '../middleware/invokeMiddleware.js'
import type { EntryServer } from '../types.js'
import { makeFilePath, ssrLoadEntryServer } from '../utils.js'

import { reactRenderToStreamResponse } from './streamHelpers.js'
import { loadAndRunRouteHooks } from './triggerRouteHooks.js'

interface CreateReactStreamingHandlerOptions {
  routes: RWRouteManifestItem[]
  clientEntryPath: string
  getStylesheetLinks: (route?: RWRouteManifestItem | RouteSpec) => string[]
  getMiddlewareRouter: () => Promise<Router.Instance<any>>
}

// Create an isbot instance that ignores the Chrome Lighthouse user agent
const isbot = createIsbotFromList(
  isbotList.filter((record) => !record.includes('chrome-lighthouse')),
)

export const createReactStreamingHandler = async (
  {
    routes,
    clientEntryPath,
    getStylesheetLinks,
    getMiddlewareRouter,
  }: CreateReactStreamingHandlerOptions,
  viteSsrDevServer?: ViteDevServer,
) => {
  const rwPaths = getPaths()
  const rwConfig = getConfig()
  const isProd = !viteSsrDevServer
  const middlewareRouter: Router.Instance<any> = await getMiddlewareRouter()
  let entryServerImport: EntryServer
  let fallbackDocumentImport: Record<string, any>
  const rscEnabled = rwConfig.experimental?.rsc?.enabled

  // Load the entries for prod only once, not in each handler invocation
  // Dev is the opposite, we load it every time to pick up changes
  if (isProd) {
    if (rscEnabled) {
      entryServerImport = await import(
        makeFilePath(rwPaths.web.distSsrEntryServer)
      )
    } else {
      entryServerImport = await import(
        makeFilePath(rwPaths.web.distSsrEntryServer)
      )
    }

    fallbackDocumentImport = await import(
      makeFilePath(rwPaths.web.distSsrDocument)
    )
  }

  // @NOTE: we are returning a FetchAPI handler
  return async (req: Request) => {
    let mwResponse = MiddlewareResponse.next()

    // Default auth state
    let decodedAuthState: ServerAuthState = {
      ...middlewareDefaultAuthProviderState,
      cookieHeader: req.headers.get('cookie'),
      roles: [],
    }

    // @TODO: Make the currentRoute 404?
    let currentRoute: RWRouteManifestItem | undefined
    let parsedParams: any = {}

    const currentUrl = new URL(req.url)

    // @TODO validate this is correct
    for (const route of routes) {
      const { match, ...rest } = matchPath(
        route.pathDefinition,
        currentUrl.pathname,
      )

      if (match) {
        currentRoute = route
        parsedParams = rest

        break
      }
    }

    // Using a function to get the CSS links because we need to wait for the
    // vite dev server to analyze the module graph
    const cssLinks = getStylesheetLinks(currentRoute)

    // ~~~ Middleware Handling ~~~
    if (middlewareRouter) {
      const matchedMw = middlewareRouter.find(req.method as HTTPMethod, req.url)
      ;[mwResponse, decodedAuthState] = await invoke(
        req,
        matchedMw?.handler as Middleware | undefined,
        {
          route: currentRoute,
          cssPaths: cssLinks,
          params: matchedMw?.params,
          viteSsrDevServer,
        },
      )

      // If mwResponse is a redirect, short-circuit here, and skip React rendering
      // If the response has a body, no need to render react.
      if (mwResponse.isRedirect() || mwResponse.body) {
        return mwResponse.toResponse()
      }
    }

    // ~~~ Middleware Handling ~~~

    if (!currentRoute) {
      throw new Error('404 handling not implemented')
    }

    if (currentRoute.redirect) {
      return new Response(null, {
        status: 302,
        headers: {
          Location: currentRoute.redirect.to,
        },
      })
    }

    // Do this inside the handler for **dev-only**.
    // This makes sure that changes to entry-server are picked up on refresh
    if (!isProd) {
      entryServerImport = await ssrLoadEntryServer(viteSsrDevServer)
      fallbackDocumentImport = await viteSsrDevServer.ssrLoadModule(
        rwPaths.web.document,
      )
    }

    const ServerEntry =
      entryServerImport.ServerEntry || entryServerImport.default

    const FallbackDocument =
      fallbackDocumentImport.Document || fallbackDocumentImport.default

    let metaTags: TagDescriptor[] = []

    let routeHookPath = currentRoute.routeHooks

    if (isProd) {
      routeHookPath = currentRoute.routeHooks
        ? path.join(rwPaths.web.distRouteHooks, currentRoute.routeHooks)
        : null
    }

    // @TODO can we load the route hook outside the handler?
    const routeHookOutput = await loadAndRunRouteHooks({
      paths: [getAppRouteHook(isProd), routeHookPath],
      reqMeta: {
        req,
        parsedParams,
      },
      viteSsrDevServer,
    })

    metaTags = routeHookOutput.meta

    // On dev, we don't need to add the slash (for windows support) any more
    const jsBundles = [
      viteSsrDevServer ? clientEntryPath : '/' + clientEntryPath,
    ]
    if (currentRoute.bundle) {
      jsBundles.push('/' + currentRoute.bundle)
    }

    const isSeoCrawler = isbot(req.headers.get('user-agent') || '')

    const reactResponse = await reactRenderToStreamResponse(
      mwResponse,
      {
        ServerEntry,
        FallbackDocument,
        currentUrl,
        metaTags,
        cssLinks,
        isProd,
        jsBundles,
        authState: decodedAuthState,
      },
      {
        waitForAllReady: isSeoCrawler,
        onError: (err) => {
          if (!isProd && viteSsrDevServer) {
            viteSsrDevServer.ssrFixStacktrace(err)
          }

          console.error(err)
        },
      },
      viteSsrDevServer,
    )

    return reactResponse
  }
}
