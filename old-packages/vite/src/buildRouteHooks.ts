import type { PluginBuild } from 'esbuild'
import { build as esbuildBuild } from 'esbuild'

import {
  getRouteHookBabelPlugins,
  transformWithBabel,
} from '@redwoodjs/babel-config'
import { findRouteHooksSrc } from '@redwoodjs/internal/dist/files.js'
import type { Paths } from '@redwoodjs/project-config'
import { getPaths } from '@redwoodjs/project-config'

export async function buildRouteHooks(
  verbose: boolean | undefined,
  rwPaths: Paths,
) {
  const allRouteHooks = findRouteHooksSrc()

  const runRwBabelTransformsPlugin = {
    name: 'rw-esbuild-babel-transform',
    setup(build: PluginBuild) {
      build.onLoad({ filter: /\.(js|ts|tsx|jsx)$/ }, async (args) => {
        const transformedCode = await transformWithBabel(args.path, [
          ...getRouteHookBabelPlugins(),
        ])

        if (transformedCode?.code) {
          return {
            contents: transformedCode.code,
            loader: 'js',
          }
        }

        throw new Error(`Could not transform file: ${args.path}`)
      })
    },
  }

  await esbuildBuild({
    absWorkingDir: getPaths().web.base,
    entryPoints: allRouteHooks,
    platform: 'node',
    target: 'node16',
    // @MARK Disable splitting and esm, because Redwood web modules don't support esm yet
    // outExtension: { '.js': '.mjs' },
    // format: 'esm',
    // splitting: true,
    bundle: true,
    plugins: [runRwBabelTransformsPlugin],
    packages: 'external',
    logLevel: verbose ? 'info' : 'error',
    outdir: rwPaths.web.distRouteHooks,
  })
}
