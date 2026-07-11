import fs from 'node:fs'

import { build as viteBuild } from 'vite'
import { cjsInterop } from 'vite-plugin-cjs-interop'

import { getPaths } from '@redwoodjs/project-config'

import { onWarn } from '../lib/onWarn.js'
import { rscRoutesAutoLoader } from '../plugins/vite-plugin-rsc-routes-auto-loader.js'
import { rscSsrRouterImport } from '../plugins/vite-plugin-rsc-ssr-router-import.js'

/**
 * RSC build. Step 3
 * SSR build for when RSC is enabled
 */
export async function rscBuildForSsr({
  clientEntryFiles,
  verbose = false,
}: {
  clientEntryFiles: Record<string, string>
  verbose?: boolean
}) {
  console.log('\n')
  console.log('3. rscBuildForSsr')
  console.log('=================\n')

  const rwPaths = getPaths()

  if (!rwPaths.web.entryClient) {
    throw new Error('No client entry file found inside ' + rwPaths.web.src)
  }

  if (!rwPaths.web.entryServer) {
    throw new Error('No server entry file found inside ' + rwPaths.web.src)
  }

  const ssrBuildOutput = await viteBuild({
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
      ],
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
      rscRoutesAutoLoader(),
      rscSsrRouterImport(),
    ],
    build: {
      // TODO (RSC): Remove `minify: false` when we don't need to debug as often
      minify: false,
      outDir: rwPaths.web.distSsr,
      ssr: true,
      emptyOutDir: true, // Needed because `outDir` is not inside `root`
      rollupOptions: {
        onwarn: onWarn,
        input: {
          // @MARK: temporary hack to find the entry client so we can get the
          // index.css bundle but we don't actually want this on an rsc page!
          // TODO (RSC): Look into if we can remove this (and perhaps instead
          // use entry.server)
          __rwjs__client_entry: rwPaths.web.entryClient,
          'entry.server': rwPaths.web.entryServer,
          // we need this, so that the output contains rsc-specific bundles
          // for the client-only components. They get loaded once the page is
          // rendered
          ...clientEntryFiles,
          // These import redirections are so that we don't bundle multiple versions of react
          __rwjs__react: 'react',
          __rwjs__location: '@redwoodjs/router/location',
          __rwjs__server_auth_provider: '@redwoodjs/auth/ServerAuthProvider',
          __rwjs__server_inject: '@redwoodjs/web/serverInject',
          '__rwjs__rsdw-client': 'react-server-dom-webpack/client.edge',
          // TODO (RSC): add __rwjs__ prefix to the entry below
          'rd-server': 'react-dom/server.edge',
          // We need the document for React's fallback
          Document: rwPaths.web.document,
        },
        preserveEntrySignatures: 'exports-only',
        output: {
          // This is not ideal. See
          // https://rollupjs.org/faqs/#why-do-additional-imports-turn-up-in-my-entry-chunks-when-code-splitting
          // But we need it to prevent `import 'client-only'` from being
          // hoisted into App.tsx
          // TODO (RSC): Fix when https://github.com/rollup/rollup/issues/5235
          // is resolved
          hoistTransitiveImports: false,
          entryFileNames: (chunkInfo) => {
            if (
              chunkInfo.name === 'rd-server' ||
              chunkInfo.name === '__rwjs__react' ||
              chunkInfo.name === '__rwjs__location' ||
              chunkInfo.name === '__rwjs__server_auth_provider' ||
              chunkInfo.name === '__rwjs__server_inject' ||
              chunkInfo.name === '__rwjs__rsdw-client' ||
              chunkInfo.name === 'entry.server' ||
              chunkInfo.name === 'Document'
            ) {
              return '[name].mjs'
            }
            return 'assets/[name]-[hash].mjs'
          },
          chunkFileNames: `assets/[name]-[hash].mjs`,
        },
      },
      manifest: 'client-build-manifest-ssr.json',
    },
    esbuild: {
      logLevel: verbose ? 'debug' : 'silent',
      logOverride: {
        'unsupported-dynamic-import': 'silent',
      },
    },
    logLevel: verbose ? 'info' : 'silent',
  })

  if (!('output' in ssrBuildOutput)) {
    throw new Error('Unexpected vite ssr build output')
  }

  // TODO (RSC): This is horrible. Please help me find a better way to do this.
  // Really should not be search/replacing in the built files like this.
  const entryServerMjs = fs.readFileSync(
    rwPaths.web.distSsrEntryServer,
    'utf-8',
  )

  fs.writeFileSync(
    rwPaths.web.distSsrEntryServer,
    entryServerMjs.replace(
      /import (require\S+) from "graphql-scalars";/,
      'import * as $1 from "graphql-scalars";',
    ),
  )

  return ssrBuildOutput.output
}
