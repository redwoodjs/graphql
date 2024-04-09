import { build as viteBuild } from 'vite'

import { getPaths } from '@redwoodjs/project-config'

import { onWarn } from '../lib/onWarn.js'
import { rscCssPreinitPlugin } from '../plugins/vite-plugin-rsc-css-preinit.js'
import { rscRoutesAutoLoader } from '../plugins/vite-plugin-rsc-routes-auto-loader.js'
import { rscTransformUseClientPlugin } from '../plugins/vite-plugin-rsc-transform-client.js'
import { rscTransformUseServerPlugin } from '../plugins/vite-plugin-rsc-transform-server.js'

/**
 * RSC build. Step 3.
 * buildFeServer -> buildRscFeServer -> rscBuildForServer
 * Generate the output to be used by the rsc worker (not the actual server!)
 */
export async function rscBuildForServer(
  clientEntryFiles: Record<string, string>,
  serverEntryFiles: Record<string, string>,
  customModules: Record<string, string>,
  componentImportMap: Map<string, string[]>,
) {
  console.log('\n')
  console.log('3. rscBuildForServer')
  console.log('====================\n')

  const rwPaths = getPaths()

  if (!rwPaths.web.entries) {
    throw new Error('RSC entries file not found')
  }

  const input = {
    entries: rwPaths.web.entries,
    ...clientEntryFiles,
    ...serverEntryFiles,
    ...customModules,
  }

  // TODO (RSC): No redwood-vite plugin, add it in here
  const rscServerBuildOutput = await viteBuild({
    envFile: false,
    ssr: {
      // Inline every file apart from node built-ins. We want vite/rollup to
      // inline dependencies in the server bundle. This gets round runtime
      // importing of "server-only". We have to do all imports because we can't
      // rely on "server-only" being the name of the package. This is also
      // actually more efficient because less files. Although, at build time
      // it's likely way less efficient because we have to do so many files.
      // Files included in `noExternal` are files we want Vite to analyze
      // As of vite 5.2 `true` here means "all except node built-ins"
      noExternal: true,
      // Can't inline prisma client (db calls fail at runtime) or react-dom
      // (css pre-init failure)
      external: ['@prisma/client', 'react-dom'],
      resolve: {
        // These conditions are used in the plugin pipeline, and only affect non-externalized
        // dependencies during the SSR build. Which because of `noExternal: true` means all
        // dependencies apart from node built-ins.
        conditions: ['react-server'],
      },
    },
    plugins: [
      // The rscTransformPlugin maps paths like
      // /Users/tobbe/.../rw-app/node_modules/@tobbe.dev/rsc-test/dist/rsc-test.es.js
      // to
      // /Users/tobbe/.../rw-app/web/dist/server/assets/rsc0.js
      // That's why it needs the `clientEntryFiles` data
      // (It does other things as well, but that's why it needs clientEntryFiles)
      rscTransformUseClientPlugin(clientEntryFiles),
      rscTransformUseServerPlugin(),
      rscCssPreinitPlugin(clientEntryFiles, componentImportMap),
      rscRoutesAutoLoader(),
    ],
    build: {
      // TODO (RSC): Remove `minify: false` when we don't need to debug as often
      minify: false,
      ssr: true,
      ssrEmitAssets: true,
      outDir: rwPaths.web.distRsc,
      emptyOutDir: true, // Needed because `outDir` is not inside `root`
      manifest: 'server-build-manifest.json',
      rollupOptions: {
        onwarn: onWarn,
        input,
        output: {
          banner: (chunk) => {
            // HACK to bring directives to the front
            let code = ''
            const clientValues = Object.values(clientEntryFiles)
            console.log('chunk.moduleIds', chunk.moduleIds)
            console.log('clientValues', clientValues)
            if (chunk.moduleIds.some((id) => clientValues.includes(id))) {
              console.log('adding "use client" to', chunk.fileName)
              code += '"use client";'
            }

            const serverValues = Object.values(serverEntryFiles)
            console.log('serverValues', serverValues)
            if (chunk.moduleIds.some((id) => serverValues.includes(id))) {
              console.log('adding "use server" to', chunk.fileName)
              code += '"use server";'
            }
            return code
          },
          entryFileNames: (chunkInfo) => {
            // TODO (RSC) Probably don't want 'entries'. And definitely don't want it hardcoded
            if (chunkInfo.name === 'entries' || customModules[chunkInfo.name]) {
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
