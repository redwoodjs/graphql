import path from 'node:path'

import { getPaths } from '@redwoodjs/project-config'

import { moduleMap } from './ssrModuleMap.js'
import { importRsdwClient, importReact, importRsdwServer } from './utils.js'
import { makeFilePath } from './utils.js'

async function getEntries() {
  if (globalThis.__rwjs__vite_ssr_runtime) {
    return {
      serverEntries: {
        __rwjs__Routes: '../../src/Routes.tsx',
      },
      ssrEntries: {},
    }
  }

  const entriesPath = getPaths().web.distRscEntries
  const entries = await import(makeFilePath(entriesPath))
  return entries
}

async function getRoutesComponent(): Promise<React.FunctionComponent> {
  // For SSR during dev
  if (globalThis.__rwjs__vite_rsc_runtime) {
    const routesMod = await globalThis.__rwjs__vite_rsc_runtime.executeUrl(
      getPaths().web.routes,
    )

    return routesMod.default
  }

  // For SSR during prod
  const { serverEntries } = await getEntries()
  const entryPath = path.join(
    getPaths().web.distRsc,
    serverEntries['__rwjs__Routes'],
  )
  console.log('getRoutesComponent entryPath', entryPath)
  const routesModule = await import(makeFilePath(entryPath))

  return routesModule.default
}

// This gets executed in an RSC server "world" and should return the path to
// the chunk in the client/browser "world"
function resolveClientEntryForProd(
  filePath: string,
  clientEntries: Record<string, string>,
) {
  const basePath = getPaths().web.distSsr
  const entriesFile = getPaths().web.distRscEntries
  const baseDir = path.dirname(entriesFile)
  const absoluteClientEntries = Object.fromEntries(
    Object.entries(clientEntries).map(([key, val]) => {
      let fullKey = path.join(baseDir, key)

      if (process.platform === 'win32') {
        fullKey = fullKey.replaceAll('\\', '/')
      }

      return [fullKey, basePath + path.sep + val]
    }),
  )

  const filePathSlash = filePath.replaceAll('\\', '/')
  const clientEntry = absoluteClientEntries[filePathSlash]

  console.log('resolveClientEntryForProd during SSR - clientEntry', clientEntry)

  if (!clientEntry) {
    // TODO (RSC): Is this ever used?
    if (absoluteClientEntries['*'] === '*') {
      return basePath + path.relative(getPaths().base, filePathSlash)
    }

    throw new Error('No client entry found for ' + filePathSlash)
  }

  return clientEntry
}

// TODO (RSC): Make our own module loading use the same cache as the webpack
// shim for performance
// const moduleLoading = (globalThis as any).__webpack_module_loading__
// const moduleCache = (globalThis as any).__webpack_module_cache__

const rscCache = new Map<string, Thenable<React.ReactElement>>()

/**
 * Render the RW App's Routes.{tsx,jsx} component.
 * In production, this function will read the Routes component from the App's
 * dist directory.
 * During dev, this function will use Vite to load the Routes component from
 * the App's src directory.
 */
export async function renderRoutesSsr(pathname: string) {
  console.log('renderRoutesSsr pathname', pathname)

  const cached = rscCache.get(pathname)
  if (cached) {
    return cached
  }

  const Routes = await getRoutesComponent()

  console.log('clientSsr.ts getEntries()', await getEntries())
  const clientEntries = (await getEntries()).ssrEntries

  // TODO (RSC): Try removing the proxy here and see if it's really necessary.
  // Looks like it'd work to just have a regular object with a getter.
  // Remove the proxy and see what breaks.
  const bundlerConfig = new Proxy(
    {},
    {
      get(_target, encodedId: string) {
        console.log('Proxy get encodedId', encodedId)
        const [filePath, name] = encodedId.split('#') as [string, string]
        // filePath /Users/tobbe/tmp/test-project-rsc-kitchen-sink/web/dist/rsc/assets/rsc-AboutCounter.tsx-1.mjs
        // name AboutCounter

        const id = globalThis.__rwjs__vite_ssr_runtime
          ? filePath
          : resolveClientEntryForProd(filePath, clientEntries)

        console.log('clientSsr.ts::Proxy id', id)
        // id /Users/tobbe/tmp/test-project-rsc-kitchen-sink/web/dist/browser/assets/rsc-AboutCounter.tsx-1-4kTKU8GC.mjs
        return { id, chunks: [id], name, async: true }
      },
    },
  )

  const { createElement } = await importReact()
  const { renderToReadableStream } = await importRsdwServer()

  console.log('clientSsr.ts right before renderToReadableStream')
  // We're in clientSsr.ts, but we're supposed to be pretending we're in the
  // RSC server "world" and that `stream` comes from `fetch`. So this is us
  // emulating the reply (stream) you'd get from a fetch call.
  const originalStream = renderToReadableStream(
    createElement(Routes),
    bundlerConfig,
  )

  // Clone and log the stream
  const [streamForLogging, streamForRendering] = originalStream.tee()

  // Log the stream content
  ;(async () => {
    const reader = streamForLogging.getReader()
    const decoder = new TextDecoder()
    let logContent = ''

    while (true /* eslint-disable-line no-constant-condition */) {
      const { done, value } = await reader.read()

      if (done) {
        break
      }

      logContent += decoder.decode(value, { stream: true })
    }

    console.log('Stream content:', logContent)
  })()

  // We have to do this weird import thing because we need a version of
  // react-server-dom-webpack/client.edge that uses the same bundled version
  // of React as all the client components. Also see comment in
  // streamHelpers.ts about the rd-server import for some more context
  const { createFromReadableStream } = await importRsdwClient()

  // Here we use `createFromReadableStream`, which is equivalent to
  // `createFromFetch` as used in the browser
  const data = createFromReadableStream(streamForRendering, {
    ssrManifest: { moduleMap, moduleLoading: null },
  })

  // TODO (RSC): Since this is SSR, do we need caching?
  rscCache.set(pathname, data)

  return data
}
