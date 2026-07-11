import type { BuildContext, BuildOptions, PluginBuild } from 'esbuild'
import { build, context } from 'esbuild'
import fs from 'fs-extra'

import {
  getApiSideBabelPlugins,
  transformWithBabel,
} from '@redwoodjs/babel-config'
import {
  getConfig,
  getPaths,
  projectSideIsEsm,
} from '@redwoodjs/project-config'

import { findApiFiles } from '../files'

let BUILD_CTX: BuildContext | null = null

export const buildApi = async () => {
  // Reset the build context for rebuilding
  // No need to wait for promise to resolve
  BUILD_CTX?.dispose()
  BUILD_CTX = null

  return transpileApi(findApiFiles())
}

export const rebuildApi = async () => {
  const apiFiles = findApiFiles()

  if (!BUILD_CTX) {
    BUILD_CTX = await context(getEsbuildOptions(apiFiles))
  }

  return BUILD_CTX.rebuild()
}

export const cleanApiBuild = async () => {
  const rwjsPaths = getPaths()
  return fs.remove(rwjsPaths.api.dist)
}

const runRwBabelTransformsPlugin = {
  name: 'rw-esbuild-babel-transform',
  setup(build: PluginBuild) {
    const rwjsConfig = getConfig()

    build.onLoad({ filter: /\.(js|ts|tsx|jsx)$/ }, async (args) => {
      // @TODO Implement LRU cache? Unsure how much of a performance benefit its going to be
      // Generate a CRC of file contents, then save it to LRU cache with a limit
      // without LRU cache, the memory usage can become unbound
      const transformedCode = await transformWithBabel(
        args.path,
        getApiSideBabelPlugins({
          openTelemetry:
            rwjsConfig.experimental.opentelemetry.enabled &&
            rwjsConfig.experimental.opentelemetry.wrapApi,
          projectIsEsm: projectSideIsEsm('api'),
        }),
      )

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

export const transpileApi = async (files: string[]) => {
  return build(getEsbuildOptions(files))
}

function getEsbuildOptions(files: string[]): BuildOptions {
  const rwjsPaths = getPaths()
  const format = projectSideIsEsm('api') ? 'esm' : 'cjs'

  return {
    absWorkingDir: rwjsPaths.api.base,
    entryPoints: files,
    platform: 'node',
    target: 'node20',
    format,
    allowOverwrite: true,
    bundle: false,
    plugins: [runRwBabelTransformsPlugin],
    outdir: rwjsPaths.api.dist,
    // setting this to 'true' will generate an external sourcemap x.js.map
    // AND set the sourceMappingURL comment
    // (setting it to 'external' will ONLY generate the file, but won't add the comment)
    sourcemap: true,
  }
}
