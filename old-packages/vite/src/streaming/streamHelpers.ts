import path from 'node:path'

import type React from 'react'

import type {
  RenderToReadableStreamOptions,
  ReactDOMServerReadableStream,
} from 'react-dom/server'
import type { default as RDServerModule } from 'react-dom/server.edge'
import type { ViteDevServer } from 'vite'

import type { ServerAuthState } from '@redwoodjs/auth/dist/AuthProvider/ServerAuthProvider.js'
import type * as ServerAuthProviderModule from '@redwoodjs/auth/dist/AuthProvider/ServerAuthProvider.js'
import { getConfig, getPaths } from '@redwoodjs/project-config'
import type * as LocationModule from '@redwoodjs/router/location'
import type { TagDescriptor } from '@redwoodjs/web'
import type { MiddlewareResponse } from '@redwoodjs/web/middleware'
import type * as ServerInjectModule from '@redwoodjs/web/serverInject'

import type { ServerEntryType } from '../types.js'
import { makeFilePath } from '../utils.js'

import { createBufferedTransformStream } from './transforms/bufferedTransform.js'
import { createTimeoutTransform } from './transforms/cancelTimeoutTransform.js'
import { createServerInjectionTransform } from './transforms/serverInjectionTransform.js'

type RDServerType = typeof RDServerModule
type ServerInjectType = typeof ServerInjectModule
type LocationType = typeof LocationModule
type ServerAuthProviderType = typeof ServerAuthProviderModule

interface RenderToStreamArgs {
  ServerEntry: ServerEntryType
  FallbackDocument: React.FunctionComponent
  currentUrl: URL
  metaTags: TagDescriptor[]
  cssLinks: string[]
  isProd: boolean
  jsBundles?: string[]
  authState: ServerAuthState
}

interface StreamOptions {
  waitForAllReady?: boolean
  onError?: (err: Error) => void
}

const rscWebpackShims = `\
globalThis.__rw_module_cache__ ||= new Map();

globalThis.__webpack_chunk_load__ ||= (id) => {
  console.log('rscWebpackShims chunk load id', id)
  return import(id).then((mod) => {
    console.log('rscWebpackShims chunk load mod', mod)

    // checking mod.default to better support CJS. If it's an object, it's
    // likely a CJS module. Otherwise it's probably an ES module with a
    // default export
    if (mod.default && typeof mod.default === 'object') {
      return globalThis.__rw_module_cache__.set(id, mod.default)
    }

    return globalThis.__rw_module_cache__.set(id, mod)
  })
};

globalThis.__webpack_require__ ||= (id) => {
  console.log('rscWebpackShims require id', id)
  return globalThis.__rw_module_cache__.get(id)
};
`

export async function reactRenderToStreamResponse(
  mwRes: MiddlewareResponse,
  renderOptions: RenderToStreamArgs,
  streamOptions: StreamOptions,
  viteDevServer?: ViteDevServer,
) {
  const { waitForAllReady = false } = streamOptions
  const {
    ServerEntry,
    FallbackDocument,
    currentUrl,
    metaTags,
    cssLinks,
    isProd,
    jsBundles = [],
    authState,
  } = renderOptions

  if (!isProd) {
    // For development, we need to inject the react-refresh runtime
    // Avoid using __dirname because this module is now ESM
    jsBundles.push(
      new URL('../../inject/reactRefresh.js', import.meta.url).pathname,
    )
  }

  const assetMap = JSON.stringify({
    css: cssLinks,
    meta: metaTags,
  })

  const rscEnabled = getConfig().experimental?.rsc?.enabled

  const { createElement }: React = rscEnabled
    ? await importModule('__rwjs__react', !!viteDevServer)
    : await import('react')

  const {
    createInjector,
    ServerHtmlProvider,
    ServerInjectedHtml,
  }: ServerInjectType = rscEnabled
    ? await importModule('__rwjs__server_inject', !!viteDevServer)
    : await import('@redwoodjs/web/serverInject')
  const { renderToString }: RDServerType = rscEnabled
    ? await importModule('rd-server', !!viteDevServer)
    : await import('react-dom/server')

  // This ensures an isolated state for each request
  const { injectionState, injectToPage } = createInjector()

  // This makes it safe for us to inject at any point in the stream
  const bufferTransform = createBufferedTransformStream()

  // This is a transformer stream, that will inject all things called with useServerInsertedHtml
  const serverInjectionTransform = createServerInjectionTransform({
    injectionState,
    createElement,
    ServerInjectedHtml,
    renderToString,
    onlyOnFlush: waitForAllReady,
  })

  // Timeout after 10 seconds
  // @TODO make this configurable
  const controller = new AbortController()
  const timeoutHandle = setTimeout(() => {
    controller.abort()
  }, 10000)

  const timeoutTransform = createTimeoutTransform(timeoutHandle)

  const { ServerAuthProvider }: ServerAuthProviderType = rscEnabled
    ? await importModule('__rwjs__server_auth_provider', !!viteDevServer)
    : await import('@redwoodjs/auth/dist/AuthProvider/ServerAuthProvider.js')
  const { LocationProvider }: LocationType = rscEnabled
    ? await importModule('__rwjs__location', !!viteDevServer)
    : await import('@redwoodjs/router/location')

  const renderRoot = (url: URL) => {
    return createElement(
      ServerAuthProvider,
      {
        value: authState,
      },
      createElement(
        LocationProvider,
        {
          location: url,
        },
        createElement(
          ServerHtmlProvider,
          {
            value: injectToPage,
          },
          createElement(ServerEntry, {
            css: cssLinks,
            meta: metaTags,
          }),
        ),
      ),
    )
  }

  /**
   * These are the opts that inject the bundles, and Assets into html
   */
  const bootstrapOptions = {
    bootstrapScriptContent:
      // Only insert assetMap if client side JS will be loaded
      jsBundles.length > 0
        ? `window.__REDWOOD__ASSET_MAP = ${assetMap}; ${rscWebpackShims}`
        : undefined,
    bootstrapModules: jsBundles,
  }

  // We'll use `renderToReadableStream` to start the whole React rendering
  // process. This will internally initialize React and its hooks. It's
  // important that this initializes the same React instance that all client
  // modules (components) will later use when they render. Had we just imported
  // `react-dom/server.edge` normally we would have gotten an instance based on
  // react and react-dom in node_modules. All client components however uses a
  // bundled version of React (so that we can have one version of react with
  // the react-server condition and one without at the same time). Importing it
  // like this we make sure that SSR uses that same bundled version of react
  // and react-dom as the components.
  // TODO (RSC): Always import using importModule when RSC is on by default
  const { renderToReadableStream }: RDServerType = rscEnabled
    ? await importModule('rd-server', !!viteDevServer)
    : await import('react-dom/server.edge')

  try {
    // This gets set if there are errors inside Suspense boundaries
    let didErrorOutsideShell = false

    // Assign here so we get types, the dynamic import messes types
    const renderToStreamOptions: RenderToReadableStreamOptions = {
      ...bootstrapOptions,
      signal: controller.signal,
      onError: (err: any) => {
        didErrorOutsideShell = true
        console.error('🔻 Caught error outside shell')
        streamOptions.onError?.(err)
      },
    }

    const root: React.ReactNode = renderRoot(currentUrl)

    const reactStream: ReactDOMServerReadableStream =
      await renderToReadableStream(root, renderToStreamOptions)

    // @NOTE: very important that we await this before we apply any transforms
    if (waitForAllReady) {
      await reactStream.allReady
    }

    const transformsToApply = [
      !waitForAllReady && bufferTransform,
      serverInjectionTransform,
      !waitForAllReady && timeoutTransform,
    ]

    const outputStream: ReadableStream<Uint8Array> = applyStreamTransforms(
      reactStream,
      transformsToApply,
    )

    mwRes.status = didErrorOutsideShell ? 500 : 200
    mwRes.body = outputStream
    mwRes.headers.set('content-type', 'text/html')

    return mwRes.toResponse()
  } catch (e) {
    console.error('🔻 Failed to render shell')
    streamOptions.onError?.(e as Error)

    // @TODO Asking for clarification from React team. Their documentation on this is incomplete I think.
    // Having the Document (and bootstrap scripts) here allows client to recover from errors in the shell
    // To test this, throw an error in the App on the server only
    const fallbackShell = await renderToReadableStream(
      FallbackDocument({
        children: null,
        css: cssLinks,
        meta: metaTags,
      }),
      bootstrapOptions,
    )

    mwRes.status = 500
    mwRes.body = fallbackShell
    mwRes.headers.set('content-type', 'text/html')

    return mwRes.toResponse()
  } finally {
    clearTimeout(timeoutHandle)
  }
}

function applyStreamTransforms(
  reactStream: ReactDOMServerReadableStream,
  transformsToApply: (TransformStream | false)[],
) {
  let outputStream: ReadableStream<Uint8Array> = reactStream

  for (const transform of transformsToApply) {
    // If its false, skip
    if (!transform) {
      continue
    }
    outputStream = outputStream.pipeThrough(transform)
  }

  return outputStream
}

// We have to do this to ensure we're only using one version of the library
// we're importing, and one that's built with the right conditions. rsdw will
// import React, so it's important that it imports the same version of React as
// we are. If we're pulling rsdw from node_modules (which we would if we didn't
// get it from the dist folder) we'd also get the node_modules version of
// React. But the app itself already uses the bundled version of React, so we
// can't do that, because then we'd have to different Reacts where one isn't
// initialized properly
async function importModule(
  mod:
    | 'rd-server'
    | '__rwjs__react'
    | '__rwjs__location'
    | '__rwjs__server_auth_provider'
    | '__rwjs__server_inject',
  isDev?: boolean,
) {
  if (isDev) {
    if (mod === 'rd-server') {
      const loadedMod = await import('react-dom/server.edge')
      return loadedMod.default
    } else if (mod === '__rwjs__react') {
      const loadedMod = await import('react')
      return loadedMod.default
    } else if (mod === '__rwjs__location') {
      const loadedMod = await import('@redwoodjs/router/location')
      return loadedMod
    } else if (mod === '__rwjs__server_auth_provider') {
      const loadedMod = await import(
        '@redwoodjs/auth/dist/AuthProvider/ServerAuthProvider.js'
      )
      return loadedMod
    } else if (mod === '__rwjs__server_inject') {
      const loadedMod = await import('@redwoodjs/web/serverInject')
      return loadedMod
    }
  } else {
    const distSsr = getPaths().web.distSsr
    const rdServerPath = makeFilePath(path.join(distSsr, 'rd-server.mjs'))
    const reactPath = makeFilePath(path.join(distSsr, '__rwjs__react.mjs'))
    const locationPath = makeFilePath(
      path.join(distSsr, '__rwjs__location.mjs'),
    )
    const serverAuthProviderPath = makeFilePath(
      path.join(distSsr, '__rwjs__server_auth_provider.mjs'),
    )
    const serverInjectPath = makeFilePath(
      path.join(distSsr, '__rwjs__server_inject.mjs'),
    )

    if (mod === 'rd-server') {
      return (await import(rdServerPath)).default
    } else if (mod === '__rwjs__react') {
      return (await import(reactPath)).default
    } else if (mod === '__rwjs__location') {
      return await import(locationPath)
    } else if (mod === '__rwjs__server_auth_provider') {
      return await import(serverAuthProviderPath)
    } else if (mod === '__rwjs__server_inject') {
      // Don't need default because rwjs/web is now ESM
      return await import(serverInjectPath)
    }
  }

  throw new Error('Unknown module ' + mod)
}
