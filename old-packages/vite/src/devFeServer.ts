import http from 'node:http'

import { createServerAdapter } from '@whatwg-node/server'
import express from 'express'
import type { HTTPMethod } from 'find-my-way'
import type { ViteDevServer } from 'vite'
import { createServer as createViteServer, createViteRuntime } from 'vite'
import { cjsInterop } from 'vite-plugin-cjs-interop'

import type { RouteSpec } from '@redwoodjs/internal/dist/routes.js'
import { getProjectRoutes } from '@redwoodjs/internal/dist/routes.js'
import type { Paths } from '@redwoodjs/project-config'
import { getConfig, getPaths } from '@redwoodjs/project-config'
import {
  createPerRequestMap,
  createServerStorage,
} from '@redwoodjs/server-store'
import type { Middleware } from '@redwoodjs/web/middleware'

import { registerFwGlobalsAndShims } from './lib/registerFwGlobalsAndShims.js'
import { invoke } from './middleware/invokeMiddleware.js'
import { createMiddlewareRouter } from './middleware/register.js'
import { rscRoutesAutoLoader } from './plugins/vite-plugin-rsc-routes-auto-loader.js'
import { rscRoutesImports } from './plugins/vite-plugin-rsc-routes-imports.js'
import { rscSsrRouterImport } from './plugins/vite-plugin-rsc-ssr-router-import.js'
import { rscTransformUseServerPlugin } from './plugins/vite-plugin-rsc-transform-server.js'
import { createWebSocketServer } from './rsc/rscWebSocketServer.js'
import { collectCssPaths, componentsModules } from './streaming/collectCss.js'
import { createReactStreamingHandler } from './streaming/createReactStreamingHandler.js'
import {
  convertExpressHeaders,
  ensureProcessDirWeb,
  getFullUrl,
} from './utils.js'

// TODO (STREAMING) Just so it doesn't error out. Not sure how to handle this.
globalThis.__REDWOOD__PRERENDER_PAGES = {}
globalThis.__rwjs__vite_ssr_runtime = undefined
globalThis.__rwjs__vite_rsc_runtime = undefined

async function createServer() {
  ensureProcessDirWeb()

  registerFwGlobalsAndShims()

  const app = express()
  // We do this to have a server to pass to Vite's HMR functionality, to be
  // able to pass it along to the express server, to get WS support all the way
  // through. (This is not currently implemented, this is just in preparation)
  // TODO (RSC): Figure out all the HMR stuff
  const server = http.createServer(app)
  const rwPaths = getPaths()

  const rscEnabled = getConfig().experimental.rsc?.enabled ?? false

  // Per request store is only used in server components
  const serverStorage = createServerStorage()

  app.use('*', (req, _res, next) => {
    const fullUrl = getFullUrl(req, rscEnabled)

    const perReqStore = createPerRequestMap({
      // Convert express headers to fetch header
      headers: convertExpressHeaders(req.headersDistinct),
      fullUrl,
    })

    // By wrapping next, we ensure that all of the other handlers will use this same perReqStore
    // But note that the serverStorage is RE-initialised for the RSC worker
    serverStorage.run(perReqStore, next)
  })

  // ~~~ Dev time validations ~~~~
  // TODO (STREAMING) When Streaming is released Vite will be the only bundler,
  // and this file should always exist. So the error message needs to change
  // (or be removed perhaps)
  if (!rwPaths.web.entryServer || !rwPaths.web.entryClient) {
    throw new Error(
      'Vite entry points not found. Please check that your project has ' +
        'an entry.client.{jsx,tsx} and entry.server.{jsx,tsx} file in ' +
        'the web/src directory.',
    )
  }

  if (!rwPaths.web.viteConfig) {
    throw new Error(
      'Vite config not found. You need to setup your project with Vite using `yarn rw setup vite`',
    )
  }
  // ~~~~ Dev time validations ~~~~

  // Create Vite server in middleware mode and configure the app type as
  // 'custom', disabling Vite's own HTML serving logic so parent server
  // can take control
  const viteSsrDevServer = await createViteServer({
    configFile: rwPaths.web.viteConfig,
    envFile: false,
    define: {
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
    },
    ssr: {
      // Inline every file apart from node built-ins. We want vite/rollup to
      // inline dependencies in the server build. This gets round runtime
      // importing of "server-only" and other packages with poisoned imports.
      //
      // Files included in `noExternal` are files we want Vite to analyze
      // As of vite 5.2 `true` here means "all except node built-ins"
      // noExternal: true,
      // TODO (RSC): Other frameworks build for RSC without `noExternal: true`.
      // What are we missing here? When/why is that a better choice? I know
      // we would have to explicitly add a bunch of packages to noExternal, if
      // we wanted to go that route.
      // noExternal: ['@tobbe.dev/rsc-test'],
      // Can't inline prisma client (db calls fail at runtime) or react-dom
      // (css pre-init failure)
      // Server store has to be externalized, because it's a singleton (shared between FW and App)
      external: [
        '@prisma/client',
        '@prisma/fetch-engine',
        '@prisma/internals',
        '@redwoodjs/auth-dbauth-api',
        '@redwoodjs/cookie-jar',
        '@redwoodjs/server-store',
        '@simplewebauthn/server',
        'graphql-scalars',
        'minimatch',
        'playwright',
        'react-dom',
      ],
      resolve: {
        // These conditions are used in the plugin pipeline, and only affect non-externalized
        // dependencies during the SSR build. Which because of `noExternal: true` means all
        // dependencies apart from node built-ins.
        // TODO (RSC): What's the difference between `conditions` and
        // `externalConditions`? When is one used over the other?
        // conditions: ['react-server'],
        // externalConditions: ['react-server'],
      },
      optimizeDeps: {
        // We need Vite to optimize these dependencies so that they are resolved
        // with the correct conditions. And so that CJS modules work correctly.
        // include: [
        //   'react/**/*',
        //   'react-dom/server',
        //   'react-dom/server.edge',
        //   'rehackt',
        //   'react-server-dom-webpack/server',
        //   'react-server-dom-webpack/client',
        //   '@apollo/client/cache/*',
        //   '@apollo/client/utilities/*',
        //   '@apollo/client/react/hooks/*',
        //   'react-fast-compare',
        //   'invariant',
        //   'shallowequal',
        //   'graphql/language/*',
        //   'stacktracey',
        //   'deepmerge',
        //   'fast-glob',
        // ],
      },
    },
    resolve: {
      // conditions: ['react-server'],
    },
    plugins: [
      cjsInterop({
        dependencies: [
          // Skip ESM modules: rwjs/auth, rwjs/web, rwjs/auth-*-middleware, rwjs/router
          '@redwoodjs/forms',
          '@redwoodjs/prerender/*',
          '@redwoodjs/auth-*-api',
          '@redwoodjs/auth-*-web',
        ],
      }),
      rscEnabled && rscRoutesAutoLoader(),
      rscEnabled && rscSsrRouterImport(),
    ],
    server: { middlewareMode: true },
    logLevel: 'info',
    clearScreen: false,
    appType: 'custom',
  })

  globalThis.__rwjs__vite_ssr_runtime =
    await createViteRuntime(viteSsrDevServer)
  globalThis.__rwjs__client_references = new Set<string>()
  globalThis.__rwjs__server_references = new Set<string>()

  // const clientEntryFileSet = new Set<string>()
  // const serverEntryFileSet = new Set<string>()

  // TODO (RSC): No redwood-vite plugin, add it in here
  const viteRscServer = await createViteServer({
    envFile: false,
    define: {
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
    },
    ssr: {
      // Inline every file apart from node built-ins. We want vite/rollup to
      // inline dependencies in the server build. This gets round runtime
      // importing of "server-only" and other packages with poisoned imports.
      //
      // Files included in `noExternal` are files we want Vite to analyze
      // As of vite 5.2 `true` here means "all except node built-ins"
      noExternal: true,
      // TODO (RSC): Other frameworks build for RSC without `noExternal: true`.
      // What are we missing here? When/why is that a better choice? I know
      // we would have to explicitly add a bunch of packages to noExternal, if
      // we wanted to go that route.
      // noExternal: ['@tobbe.dev/rsc-test'],
      // Can't inline prisma client (db calls fail at runtime) or react-dom
      // (css pre-init failure)
      // Server store has to be externalized, because it's a singleton (shared between FW and App)
      external: [
        '@prisma/client',
        '@prisma/fetch-engine',
        '@prisma/internals',
        '@redwoodjs/auth-dbauth-api',
        '@redwoodjs/cookie-jar',
        '@redwoodjs/server-store',
        '@redwoodjs/structure',
        '@simplewebauthn/server',
        'graphql-scalars',
        'minimatch',
        'playwright',
        'react-dom',
      ],
      resolve: {
        // These conditions are used in the plugin pipeline, and only affect non-externalized
        // dependencies during the SSR build. Which because of `noExternal: true` means all
        // dependencies apart from node built-ins.
        // TODO (RSC): What's the difference between `conditions` and
        // `externalConditions`? When is one used over the other?
        conditions: ['react-server'],
        externalConditions: ['react-server'],
      },
      optimizeDeps: {
        // We need Vite to optimize these dependencies so that they are resolved
        // with the correct conditions. And so that CJS modules work correctly.
        include: [
          'react/**/*',
          'react-dom/server',
          'react-dom/server.edge',
          'rehackt',
          'react-server-dom-webpack/server',
          'react-server-dom-webpack/server.edge',
          'react-server-dom-webpack/client',
          'react-server-dom-webpack/client.edge',
          '@apollo/client/cache/*',
          '@apollo/client/utilities/*',
          '@apollo/client/react/hooks/*',
          'react-fast-compare',
          'invariant',
          'shallowequal',
          'graphql/language/*',
          'stacktracey',
          'deepmerge',
          'fast-glob',
          '@whatwg-node/fetch',
          'busboy',
          'cookie',
        ],
        // Without excluding `util` we get "TypeError: util.TextEncoder is not
        // a constructor" in react-server-dom-webpack.server because it'll try
        // to use Browserify's `util` instead of Node's. And Browserify's
        // polyfill is missing TextEncoder+TextDecoder. The reason it's using
        // the Browserify polyfill is because we have
        // `vite-plugin-node-polyfills` as a dependency, and that'll add
        // Browserify's `node-util` to `node_modules`, so when Vite goes to
        // resolve `import { TextEncoder } from 'util` it'll find the one in
        // `node_modules` instead of Node's internal version.
        // We only see this in dev, and not in prod. I'm not entirely sure why
        // but I have two guesses: 1. When RSC is enabled we don't actually use
        // `vite-plugin-node-polyfill`, so some kind of tree shaking is
        // happening, which prevents the issue from occurring. 2. In prod we
        // only use Node's dependency resolution. Vite is not involved. And
        // that difference in resolution is what prevents the issue from
        // occurring.
        exclude: ['util'],
      },
    },
    resolve: {
      conditions: ['react-server'],
    },
    plugins: [
      {
        name: 'rsc-record-and-tranform-use-client-plugin',
        transform(code, id, _options) {
          // This is called from `getRoutesComponent()` in `clientSsr.ts`
          // during SSR. So options.ssr will be true in that case.
          // TODO (RSC): When is this called outside of SSR?

          // TODO (RSC): We need to make sure this `id` always matches what
          // vite uses
          globalThis.__rwjs__client_references?.delete(id)

          // If `code` doesn't start with "use client" or 'use client' we can
          // skip this file
          if (!/^(["'])use client\1/.test(code)) {
            return undefined
          }

          console.log(
            'rsc-record-and-transform-use-client-plugin: ' +
              'adding client reference',
            id,
          )
          globalThis.__rwjs__client_references?.add(id)

          // TODO (RSC): Proper AST parsing would be more robust than simple
          // regex matching. But this is a quick and dirty way to get started
          const fns = code.matchAll(/export function (\w+)\(/g)
          const consts = code.matchAll(/export const (\w+) = \(/g)
          const names = [...fns, ...consts].map(([, name]) => name)

          const result = [
            `import { registerClientReference } from "react-server-dom-webpack/server.edge";`,
            '',
            ...names.map((name) => {
              return name === 'default'
                ? `export default registerClientReference({}, "${id}", "${name}");`
                : `export const ${name} = registerClientReference({}, "${id}", "${name}");`
            }),
          ].join('\n')

          console.log('rsc-record-and-transform-use-client-plugin result')
          console.log(
            result
              .split('\n')
              .map((line, i) => `  ${i + 1}: ${line}`)
              .join('\n'),
          )

          return { code: result, map: null }
        },
      },
      rscTransformUseServerPlugin('', {}),

      // The rscTransformUseClientPlugin maps paths like
      // /Users/tobbe/.../rw-app/node_modules/@tobbe.dev/rsc-test/dist/rsc-test.es.js
      // to
      // /Users/tobbe/.../rw-app/web/dist/ssr/assets/rsc0.js
      // That's why it needs the `clientEntryFiles` data
      // (It does other things as well, but that's why it needs clientEntryFiles)
      // rscTransformUseClientPlugin(clientEntryFiles),
      // rscTransformUseServerPlugin(outDir, serverEntryFiles),
      rscRoutesImports(),
      {
        name: 'rsc-hot-update',
        handleHotUpdate(ctx) {
          console.log('rsc-hot-update ctx.modules', ctx.modules)
          return []
        },
      },
    ],
    build: {
      ssr: true,
    },
    server: {
      // We never call `viteRscServer.listen()`, so we should run this in
      // middleware mode
      middlewareMode: true,
      // The hmr/fast-refresh websocket in this server collides with the one in
      // the other Vite server. So we can either disable it or run it on a
      // different port.
      // TODO (RSC): Figure out if we should disable or just pick a different
      // port
      ws: false,
      // hmr: {
      //   port: 24679,
      // },
    },
    appType: 'custom',
    // Using a unique cache dir here to not clash with our other vite server
    cacheDir: '../node_modules/.vite-rsc',
  })

  globalThis.__rwjs__vite_rsc_runtime = await createViteRuntime(viteRscServer)

  // create a handler that will invoke middleware with or without a route
  // The DEV one will create a new middleware router on each request
  const handleWithMiddleware = (route?: RouteSpec) => {
    return createServerAdapter(async (req: Request) => {
      // Recreate middleware router on each request in dev
      const middlewareRouter = await createMiddlewareRouter(viteSsrDevServer)
      const middleware = middlewareRouter.find(
        req.method as HTTPMethod,
        req.url,
      )?.handler as Middleware | undefined

      if (!middleware) {
        return new Response('No middleware found', { status: 404 })
      }

      const [mwRes] = await invoke(req, middleware, {
        route,
        viteSsrDevServer,
      })

      return mwRes.toResponse()
    })
  }

  // use vite's connect instance as middleware
  app.use(viteSsrDevServer.middlewares)

  if (rscEnabled) {
    createWebSocketServer()

    const { createRscRequestHandler } =
      await globalThis.__rwjs__vite_rsc_runtime.executeUrl(
        new URL('./rsc/rscRequestHandler.js', import.meta.url).pathname,
      )

    // Mounting middleware at /rw-rsc will strip /rw-rsc from req.url
    app.use(
      '/rw-rsc',
      await createRscRequestHandler({
        getMiddlewareRouter: async () =>
          createMiddlewareRouter(viteSsrDevServer),
        viteSsrDevServer,
      }),
    )
  }

  const routes = getProjectRoutes()

  const routeHandler = await createReactStreamingHandler(
    {
      routes,
      clientEntryPath: rwPaths.web.entryClient,
      getStylesheetLinks: (route) => {
        // In dev route is a RouteSpec, with additional properties
        return getCssLinks({
          rwPaths,
          route: route as RouteSpec,
          viteSsrDevServer,
        })
      },
      // Recreate middleware router on each request in dev
      getMiddlewareRouter: async () => createMiddlewareRouter(viteSsrDevServer),
    },
    viteSsrDevServer,
  )

  app.get('*', createServerAdapter(routeHandler))

  // invokes middleware for any POST request for auth
  app.post('*', handleWithMiddleware())

  const port = getConfig().web.port
  console.log(`Started server on http://localhost:${port}`)
  return server.listen(port)
}

let devApp = createServer()

process.stdin.on('data', async (data) => {
  const str = data.toString().trim().toLowerCase()
  if (str === 'rs' || str === 'restart') {
    console.log('Restarting dev web server.....')
    ;(await devApp).close(() => {
      devApp = createServer()
    })
  }
})

/**
 * This function is used to collect the CSS links for a given route.
 *
 * Passed as a getter to the createReactStreamingHandler function, because
 * at the time of creating the handler, the ViteDevServer hasn't analysed the module graph yet
 */
function getCssLinks({
  rwPaths,
  route,
  viteSsrDevServer,
}: {
  rwPaths: Paths
  route?: RouteSpec
  viteSsrDevServer: ViteDevServer
}) {
  const appAndRouteModules = componentsModules(
    [rwPaths.web.app, route?.filePath].filter(Boolean) as string[],
    viteSsrDevServer,
  )

  const collectedCss = collectCssPaths(appAndRouteModules)

  const cssLinks = Array.from(collectedCss)
  return cssLinks
}
