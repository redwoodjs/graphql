import { build as viteBuild } from 'vite'

import { getPaths } from '@redwoodjs/project-config'

import { getEntries } from '../lib/entries.js'
import { onWarn } from '../lib/onWarn.js'
import { rscAnalyzePlugin } from '../plugins/vite-plugin-rsc-analyze.js'

/**
 * RSC build. Step 1.
 * buildFeServer -> buildRscFeServer -> rscBuildAnalyze
 * Uses rscAnalyzePlugin to collect client and server entry points
 * Starts building the AST in entries.ts
 * Doesn't output any files, only collects a list of RSCs and RSAs
 */
export async function rscBuildAnalyze() {
  console.log('\n')
  console.log('1. rscBuildAnalyze')
  console.log('==================\n')

  const rwPaths = getPaths()
  const clientEntryFileSet = new Set<string>()
  const serverEntryFileSet = new Set<string>()

  if (!rwPaths.web.viteConfig) {
    throw new Error('Vite config not found')
  }

  // TODO (RSC): Can we skip actually building here? We only need to analyze
  // the files, we don't use the generated built files for anything. Maybe we
  // can integrate this with building for the client, where we actually need
  // the build for something.
  await viteBuild({
    configFile: rwPaths.web.viteConfig,
    root: rwPaths.web.src,
    // @MARK: We don't care about the build output from this step. It's just
    // for returning the entry names. Plus, the entire RSC build is chatty
    // enough as it is. You can enable this temporarily if you need to for
    // debugging, but we're keeping it silent by default.
    logLevel: 'silent',
    plugins: [
      rscAnalyzePlugin(
        (id) => clientEntryFileSet.add(id),
        (id) => serverEntryFileSet.add(id),
      ),
    ],
    ssr: {
      // We can ignore everything that starts with `node:` because it's not
      // going to be RSCs
      // As of vite 5.2 `true` here means "all except node built-ins"
      noExternal: true,
      // Anything we know won't have "use client" or "use server" in it can
      // safely be external. The more we can externalize the better, because
      // it means we can skip analyzing them, which means faster build times.
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
        'react',
      ],
      resolve: {
        externalConditions: ['react-server'],
      },
    },
    build: {
      // TODO (RSC): Remove `minify: false` when we don't need to debug as often
      minify: false,
      manifest: 'rsc-build-manifest.json',
      write: false,
      // We generate the entries from the simple `getEntries` function that analyses
      // the various pages plus the ServerEntry file. This may need revisiting when we
      // spend time on improving dev support or expand the scope of the components
      // that are looked up via the entries mappings.
      ssr: true,
      rollupOptions: {
        onwarn: onWarn,
        input: getEntries(),
      },
    },
  })

  const clientEntryFiles = Object.fromEntries(
    Array.from(clientEntryFileSet).map((filename, i) => {
      // Need the {i} to make sure the names are unique. Could have two RSCs
      // with the same name but at different paths. But because we strip away
      // the path here just the filename is not enough.
      const rscName = `rsc-${filename.split(/[\/\\]/).at(-1)}-${i}`
      return [rscName, filename]
    }),
  )
  const serverEntryFiles = Object.fromEntries(
    Array.from(serverEntryFileSet).map((filename, i) => {
      const rsaName = `rsa-${filename.split(/[\/\\]/).at(-1)}-${i}`
      return [rsaName, filename]
    }),
  )

  console.log('clientEntryFiles', clientEntryFiles)
  console.log('serverEntryFiles', serverEntryFiles)

  return {
    clientEntryFiles,
    serverEntryFiles,
  }
}
