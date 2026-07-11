// TODO (STREAMING) Move this to a new package called @redwoodjs/fe-server (goes
// well in naming with @redwoodjs/api-server)
// Only things used during dev can be in @redwoodjs/vite. Everything else has
// to go in fe-server
// UPDATE: We decided to name the package @redwoodjs/web-server instead of
// fe-server. And it's already created, but this hasn't been moved over yet.

import path from 'node:path'
import url from 'node:url'

import { createServerAdapter } from '@whatwg-node/server'
import { config as loadDotEnv } from 'dotenv-defaults'
import express from 'express'
import type { HTTPMethod } from 'find-my-way'
import { createProxyMiddleware } from 'http-proxy-middleware'
import type { Manifest as ViteBuildManifest } from 'vite'

import { getConfig, getPaths } from '@redwoodjs/project-config'
import { getRscStylesheetLinkGenerator } from '@redwoodjs/router/rscCss'
import {
  createPerRequestMap,
  createServerStorage,
} from '@redwoodjs/server-store'
import type { Middleware } from '@redwoodjs/web/dist/server/middleware'

import { registerFwGlobalsAndShims } from './lib/registerFwGlobalsAndShims.js'
import { invoke } from './middleware/invokeMiddleware.js'
import { createMiddlewareRouter } from './middleware/register.js'
import { createWebSocketServer } from './rsc/rscWebSocketServer.js'
import { createReactStreamingHandler } from './streaming/createReactStreamingHandler.js'
import type { RWRouteManifest } from './types.js'
import { convertExpressHeaders, getFullUrl } from './utils.js'

/**
 * TODO (STREAMING)
 * We have this server in the vite package only temporarily.
 * We will need to decide where to put it, so that rwjs/internal and other heavy dependencies
 * can be removed from the final docker image
 */

// --- @MARK This should be removed once we have re-architected the rw serve command ---
// We need the dotenv, so that prisma knows the DATABASE env var
// Normally the RW cli loads this for us, but we expect this file to be run directly
// without using the CLI. Remember to remove dotenv-defaults dependency from this package
loadDotEnv({
  path: path.join(getPaths().base, '.env'),
  defaults: path.join(getPaths().base, '.env.defaults'),
  // @ts-expect-error - Old typings. @types/dotenv-defaults depends on dotenv
  // v8. dotenv-defaults uses dotenv v14
  multiline: true,
})
// ------------------------------------------------

export async function runFeServer() {
  const app = express()
  const rwPaths = getPaths()
  const rwConfig = getConfig()
  const rscEnabled = rwConfig.experimental?.rsc?.enabled

  registerFwGlobalsAndShims()

  if (rscEnabled) {
    const { setClientEntries } = await import('./rsc/rscRenderer.js')

    createWebSocketServer()

    try {
      // This will fail if we're not running in RSC mode (i.e. for Streaming SSR)
      await setClientEntries()
    } catch (e) {
      console.error('Failed to load client entries')
      console.error(e)
      process.exit(1)
    }
  }

  const routeManifestUrl = url.pathToFileURL(rwPaths.web.routeManifest).href
  const routeManifest: RWRouteManifest = (
    await import(routeManifestUrl, { with: { type: 'json' } })
  ).default

  const clientBuildManifestUrl = url.pathToFileURL(
    path.join(rwPaths.web.distBrowser, 'client-build-manifest.json'),
  ).href
  const clientBuildManifest: ViteBuildManifest = (
    await import(clientBuildManifestUrl, { with: { type: 'json' } })
  ).default

  // Even though `entry.server.tsx` is the main entry point for SSR, we still
  // need to read the client build manifest and find `entry.client.tsx` to get
  // the correct links to insert for the initial CSS files that will eventually
  // be rendered when the finalized html output is being streamed to the
  // browser. We also need it to tell React what JS bundle contains
  // `hydrateRoot` when it'll eventually get to hydrating things in the browser
  //
  // So, `clientEntry` is used to find the initial JS bundle to load in the
  // browser and also to discover CSS files that will be needed to render the
  // initial page.
  //
  // In addition to all the above the discovered CSS files are also passed to
  // all middleware that have been registered
  const clientEntry = rscEnabled
    ? clientBuildManifest['entry.client.tsx'] ||
      clientBuildManifest['entry.client.jsx']
    : Object.values(clientBuildManifest).find(
        (manifestItem) => manifestItem.isEntry,
      )

  if (!clientEntry) {
    throw new Error('Could not find client entry in build manifest')
  }

  // @MARK: In prod, we create it once up front!
  const middlewareRouter = await createMiddlewareRouter()
  const serverStorage = createServerStorage()

  const handleWithMiddleware = () => {
    return createServerAdapter(async (req: Request) => {
      const matchedMw = middlewareRouter.find(req.method as HTTPMethod, req.url)

      const handler = matchedMw?.handler as Middleware | undefined

      if (!matchedMw) {
        return new Response('No middleware found', { status: 404 })
      }

      const [mwRes] = await invoke(req, handler, {
        params: matchedMw?.params,
      })

      return mwRes.toResponse()
    })
  }

  // 1. Use static handler for assets
  // For CF workers, we'd need an equivalent of this
  app.use(
    '/assets',
    express.static(rwPaths.web.distBrowser + '/assets', { index: false }),
  )

  app.use('*', (req, _res, next) => {
    const fullUrl = getFullUrl(req, rscEnabled)
    const headers = convertExpressHeaders(req.headersDistinct)
    // Convert express headers to fetch headers
    const perReqStore = createPerRequestMap({ headers, fullUrl })

    // By wrapping next, we ensure that all of the other handlers will use this same perReqStore
    serverStorage.run(perReqStore, next)
  })

  // 2. Proxy the api server
  // TODO (STREAMING) we need to be able to specify whether proxying is required or not
  // e.g. deploying to Netlify, we don't need to proxy but configure it in Netlify
  app.use(
    rwConfig.web.apiUrl,
    createProxyMiddleware({
      changeOrigin: false,
      // Using 127.0.0.1 to force ipv4. With `localhost` you don't really know
      // if it's going to be ipv4 or ipv6
      target: `http://127.0.0.1:${rwConfig.api.port}`,
    }),
  )

  if (rscEnabled) {
    const { createRscRequestHandler } = await import(
      './rsc/rscRequestHandler.js'
    )
    // Mounting middleware at /rw-rsc will strip /rw-rsc from req.url
    app.use(
      '/rw-rsc',
      await createRscRequestHandler({
        getMiddlewareRouter: async () => middlewareRouter,
      }),
    )
  }

  // Static asset handling MUST be defined before our catch all routing handler below
  // otherwise it will catch all requests for static assets and return a 404.
  // Placing this here defines our precedence for static asset handling - that we favor
  // the static assets over any application routing.
  app.use(express.static(rwPaths.web.distBrowser, { index: false }))

  const getStylesheetLinks = rscEnabled
    ? getRscStylesheetLinkGenerator(clientEntry.css)
    : () => clientEntry.css || []

  const routeHandler = await createReactStreamingHandler({
    routes: Object.values(routeManifest),
    clientEntryPath: clientEntry.file,
    getStylesheetLinks,
    getMiddlewareRouter: async () => middlewareRouter,
  })

  // Wrap with whatwg/server adapter. Express handler -> Fetch API handler
  app.get('*', createServerAdapter(routeHandler))

  app.post('*', handleWithMiddleware())

  app.listen(rwConfig.web.port)
  console.log(
    `Started production FE server on http://localhost:${rwConfig.web.port}`,
  )
}

runFeServer()
