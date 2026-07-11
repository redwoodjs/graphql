import fs from 'fs'
import path from 'node:path'

import fg from 'fast-glob'
import type { O } from 'ts-toolbelt'
import type { Plugin as VitePlugin } from 'vite'

import { ensurePosixPath, getPaths } from '@redwoodjs/project-config'

type ConfigPlugin = O.Required<VitePlugin, 'config'>

/**
 * This plugin updates the rollup inputs to include all OG components.
 *
 * Internally, Redwood's vite settings will merge this with the default vite config, and any user config
 */
function vitePluginOgImageGen(): ConfigPlugin {
  const rwPaths = getPaths()

  const allOgComponents = fg.sync('pages/**/*.og.{jsx,tsx}', {
    cwd: rwPaths.web.src,
    absolute: true,
    // @MARK This allows us to mock the fs module in tests
    fs,
  })

  // Generates the rollup inputs for all OG components, in their subpaths
  // The actual filename doesn't have to match the Page name, just has to be next to the Page
  // e.g. { 'ogGen/pages/Posts/PostsPage': '/../pages/Posts/PostsPage/PostsPage.og.png.tsx'}

  const ogComponentInput: Record<string, string> = {}
  allOgComponents.forEach((ogComponentPath) => {
    const pathKey = path
      .relative(rwPaths.web.src, ogComponentPath)
      .replace(/\.[jt]sx?$/, '')

    // The rollup input takes '/' to create folders.
    ogComponentInput[`ogImage/${ensurePosixPath(pathKey)}`] = ogComponentPath
  })

  return {
    name: 'rw-vite-plugin-ogimage-gen',
    apply: 'build', // We only need to update rollup inputs for build
    config: (_config, env) => {
      if (env.isSsrBuild) {
        return {
          build: {
            rollupOptions: {
              input: ogComponentInput,
            },
          },
        }
      } else {
        return
      }
    },
  }
}

export default vitePluginOgImageGen
