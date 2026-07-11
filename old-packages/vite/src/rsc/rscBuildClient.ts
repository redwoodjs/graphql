import { build as viteBuild } from 'vite'

import { getPaths } from '@redwoodjs/project-config'

import { onWarn } from '../lib/onWarn.js'
import { rscRoutesAutoLoader } from '../plugins/vite-plugin-rsc-routes-auto-loader.js'
import { ensureProcessDirWeb } from '../utils.js'

/**
 * RSC build. Step 2.
 * buildFeServer -> buildRscFeServer -> rscBuildClient
 * Generate the client bundle
 */
export async function rscBuildClient(clientEntryFiles: Record<string, string>) {
  console.log('\n')
  console.log('2. rscBuildClient')
  console.log('=================\n')

  const rwPaths = getPaths()

  // Safe-guard for the future, if someone tries to include this function in
  // code that gets executed by running `vite build` or some other bin from the
  // cli
  // Running the web build in the wrong working directory can lead to
  // unintended consequences on CSS processing
  ensureProcessDirWeb()

  if (!rwPaths.web.entryClient) {
    throw new Error('Missing web/src/entry.client')
  }

  const clientBuildOutput = await viteBuild({
    envFile: false,
    define: {
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
    },
    build: {
      // TODO (RSC): Remove `minify: false` when we don't need to debug as often
      minify: false,
      outDir: rwPaths.web.distBrowser,
      emptyOutDir: true, // Needed because `outDir` is not inside `root`
      rollupOptions: {
        onwarn: onWarn,
        input: {
          // @MARK: temporary hack to find the entry client so we can get the
          // index.css bundle but we don't actually want this on an rsc page!
          __rwjs__client_entry: rwPaths.web.entryClient,
          // we need this, so that the output contains rsc-specific bundles
          // for the client-only components. They get loaded once the page is
          // rendered
          ...clientEntryFiles,
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
          entryFileNames: () => {
            // TODO (RSC): Is this the default? If so we can get rid of it
            return 'assets/[name]-[hash].mjs'
          },
          chunkFileNames: `assets/[name]-[hash].mjs`,
        },
      },
      manifest: 'client-build-manifest.json',
    },
    esbuild: {
      logLevel: 'debug',
    },
    logLevel: 'info',
    plugins: [rscRoutesAutoLoader()],
  })

  if (!('output' in clientBuildOutput)) {
    throw new Error('Unexpected vite client build output')
  }

  return clientBuildOutput.output
}
