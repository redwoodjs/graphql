import path from 'path'

import { Response } from '@whatwg-node/fetch'
import type Router from 'find-my-way'
import type { HTTPMethod } from 'find-my-way'
import isbot from 'isbot'
import type { ViteDevServer } from 'vite'

import { defaultAuthProviderState } from '@redwoodjs/auth'
import type { RouteSpec, RWRouteManifestItem } from '@redwoodjs/internal'
import { getAppRouteHook, getPaths } from '@redwoodjs/project-config'
import { matchPath } from '@redwoodjs/router'
import type { TagDescriptor } from '@redwoodjs/web'

import type { Middleware } from '../middleware/invokeMiddleware.js'
import { invoke } from '../middleware/invokeMiddleware.js'
import { MiddlewareResponse } from '../middleware/MiddlewareResponse.js'

import { reactRenderToStreamResponse } from './streamHelpers.js'
import { loadAndRunRouteHooks } from './triggerRouteHooks.js'

interface CreateReactStreamingHandlerOptions {
  routes: RWRouteManifestItem[]
  clientEntryPath: string
  getStylesheetLinks: (route: RWRouteManifestItem) => string[]
  getMiddlewareRouter: () => Router.Instance<any>
}

const checkUaForSeoCrawler = isbot.spawn()
checkUaForSeoCrawler.exclude(['chrome-lighthouse'])

export const createReactStreamingHandler = async (
  {
    routes,
    clientEntryPath,
    getStylesheetLinks,
    getMiddlewareRouter,
  }: CreateReactStreamingHandlerOptions,
  viteDevServer?: ViteDevServer,
) => {
  const rwPaths = getPaths()

  const isProd = !viteDevServer
  let middlewareRouter: Router.Instance<any> = getMiddlewareRouter()
  let entryServerImport: any
  let fallbackDocumentImport: any

  // Load the entries for prod only once, not in each handler invocation
  // Dev is the opposite, we load it everytime to pick up changes
  if (isProd) {
    entryServerImport = await import(makeFilePath(rwPaths.web.distEntryServer))
    fallbackDocumentImport = await import(
      makeFilePath(rwPaths.web.distDocumentServer)
    )
  }

  // @NOTE: we are returning a FetchAPI handler
  return async (req: Request) => {
    let mwResponse = MiddlewareResponse.next()
    let decodedAuthState = defaultAuthProviderState
    // @TODO: Make the currentRoute 404?
    let currentRoute: RWRouteManifestItem | undefined
    let parsedParams: any = {}

    const { pathname: currentPathName } = new URL(req.url)

    // @TODO validate this is correct
    for (const route of routes) {
      const { match, ...rest } = matchPath(
        route.pathDefinition,
        currentPathName,
      )
      if (match) {
        currentRoute = route
        parsedParams = rest
        break
      }
    }

    if (!currentRoute) {
      throw new Error('404 handling not implemented')
    }

    if (!isProd) {
      // Reload middleware router on each request in dev
      middlewareRouter = getMiddlewareRouter()
    }

    // ~~~ Middleware Handling ~~~
    if (middlewareRouter) {
      const middleware = middlewareRouter.find(
        req.method as HTTPMethod,
        req.url,
      )?.handler as Middleware | undefined
      ;[mwResponse, decodedAuthState = defaultAuthProviderState] = await invoke(
        req,
        middleware,
        currentRoute
          ? { route: currentRoute, cssPaths: getStylesheetLinks(currentRoute) }
          : {},
      )

      // If mwResponse is a redirect, short-circuit here, and skip React rendering
      if (mwResponse.isRedirect()) {
        return mwResponse.toResponse()
      }
    }

    // ~~~ Middleware Handling ~~~

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
      entryServerImport = await viteDevServer.ssrLoadModule(
        rwPaths.web.entryServer as string, // already validated in dev server
      )
      fallbackDocumentImport = await viteDevServer.ssrLoadModule(
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
      viteDevServer,
    })

    metaTags = routeHookOutput.meta

    // @MARK @TODO(RSC_DC): the entry path for RSC will be different,
    // because we don't want to inject a full bundle, just a slice of it
    // I'm not sure what though....
    const jsBundles = [
      clientEntryPath, // @NOTE: must have slash in front
      currentRoute.bundle && '/' + currentRoute.bundle,
    ].filter(Boolean) as string[]

    const isSeoCrawler = checkUaForSeoCrawler(
      req.headers.get('user-agent') || '',
    )

    // Using a function to get the CSS links because we need to wait for the
    // vite dev server to analyze the module graph
    const cssLinks = getStylesheetLinks(currentRoute)

    const reactResponse = await reactRenderToStreamResponse(
      mwResponse,
      {
        ServerEntry,
        FallbackDocument,
        currentPathName,
        metaTags,
        cssLinks,
        isProd,
        jsBundles,
        authState: decodedAuthState,
      },
      {
        waitForAllReady: isSeoCrawler,
        onError: (err) => {
          if (!isProd && viteDevServer) {
            viteDevServer.ssrFixStacktrace(err)
          }

          console.error(err)
        },
      },
    )

    return reactResponse
  }
}

function makeFilePath(path: string): string {
  // Without this, absolute paths can't be imported on Windows
  return 'file:///' + path
}
