import { build as viteBuild } from 'vite'

import { getPaths } from '@redwoodjs/project-config'

import { getEntries } from '../lib/entries.js'
import { onWarn } from '../lib/onWarn.js'
import { rscRoutesImports } from '../plugins/vite-plugin-rsc-routes-imports.js'
import { rscTransformUseClientPlugin } from '../plugins/vite-plugin-rsc-transform-client.js'
import { rscTransformUseServerPlugin } from '../plugins/vite-plugin-rsc-transform-server.js'

/**
 * RSC build. Step 4.
 * buildFeServer -> buildRscFeServer -> rscBuildForServer
 * Generate the output to be used by the rsc worker (not the actual server!)
 */
export async function rscBuildForServer(
  clientEntryFiles: Record<string, string>,
  serverEntryFiles: Record<string, string>,
  customModules: Record<string, string>,
) {
  console.log('\n')
  console.log('4. rscBuildForServer')
  console.log('====================\n')

  const rwPaths = getPaths()

  const entryFiles = getEntries()
  const entryFilesKeys = Object.keys(entryFiles)

  if (!rwPaths.web.entryServer) {
    throw new Error('Server Entry file not found')
  }

  /** Base path for where to place built artifacts */
  const outDir = rwPaths.web.distRsc

  // TODO (RSC): No redwood-vite plugin, add it in here
  const rscServerBuildOutput = await viteBuild({
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
    },
    plugins: [
      // The rscTransformUseClientPlugin maps paths like
      // /Users/tobbe/.../rw-app/node_modules/@tobbe.dev/rsc-test/dist/rsc-test.es.js
      // to
      // /Users/tobbe/.../rw-app/web/dist/ssr/assets/rsc0.js
      // That's why it needs the `clientEntryFiles` data
      // (It does other things as well, but that's why it needs clientEntryFiles)
      rscTransformUseClientPlugin(clientEntryFiles),
      rscTransformUseServerPlugin(outDir, serverEntryFiles),
      rscRoutesImports(),
    ],
    build: {
      // TODO (RSC): Remove `minify: false` when we don't need to debug as often
      minify: false,
      ssr: true,
      ssrEmitAssets: true,
      outDir,
      emptyOutDir: true, // Needed because `outDir` is not inside `root`
      manifest: 'server-build-manifest.json',
      rollupOptions: {
        onwarn: onWarn,
        input: {
          ...entryFiles,
          ...clientEntryFiles,
          ...serverEntryFiles,
          ...customModules,
          'entry.server': rwPaths.web.entryServer,
        },
        output: {
          banner: (chunk) => {
            // HACK to bring directives to the front
            let code = ''
            const clientValues = Object.values(clientEntryFiles)
            if (chunk.moduleIds.some((id) => clientValues.includes(id))) {
              code += '"use client";'
            }

            const serverValues = Object.values(serverEntryFiles)
            if (chunk.moduleIds.some((id) => serverValues.includes(id))) {
              code += '"use server";'
            }
            return code
          },
          entryFileNames: (chunkInfo) => {
            // Entries such as pages should be named like the other assets
            if (entryFilesKeys.includes(chunkInfo.name)) {
              return 'assets/[name]-[hash].mjs'
            }
            if (
              chunkInfo.name === 'entry.server' ||
              customModules[chunkInfo.name]
            ) {
              return '[name].mjs'
            }
            return 'assets/[name].mjs'
          },
          chunkFileNames: `assets/[name]-[hash].mjs`,
          // This is not ideal. See
          // https://rollupjs.org/faqs/#why-do-additional-imports-turn-up-in-my-entry-chunks-when-code-splitting
          // But we need it to prevent `import 'client-only'` from being
          // hoisted into App.tsx
          // TODO (RSC): Fix when https://github.com/rollup/rollup/issues/5235
          // is resolved
          hoistTransitiveImports: false,
        },
      },
    },
  })

  if (!('output' in rscServerBuildOutput)) {
    throw new Error('Unexpected rsc server build output')
  }

  return rscServerBuildOutput.output
}
