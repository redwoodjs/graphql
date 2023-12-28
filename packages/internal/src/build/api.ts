import type { Format, Platform, PluginBuild } from 'esbuild'
import { build, context } from 'esbuild'
import { removeSync } from 'fs-extra'

import {
  getApiSideBabelPlugins,
  transformWithBabel,
} from '@redwoodjs/babel-config'
import { getConfig, getPaths } from '@redwoodjs/project-config'

import { findApiFiles } from '../files'

export const buildApi = async () => {
  cleanApiBuild()
  return transpileApi(findApiFiles())
}

export const cleanApiBuild = () => {
  const rwjsPaths = getPaths()
  removeSync(rwjsPaths.api.dist)
}

const runRwBabelTransformsPlugin = {
  name: 'rw-esbuild-babel-transform',
  setup(build: PluginBuild) {
    const rwjsConfig = getConfig()

    build.onLoad({ filter: /\.(js|ts|tsx|jsx)$/ }, async (args) => {
      //  Remove RedwoodJS "magic" from a user's code leaving JavaScript behind.
      const transformedCode = transformWithBabel(
        args.path,
        getApiSideBabelPlugins({
          openTelemetry:
            rwjsConfig.experimental.opentelemetry.enabled &&
            rwjsConfig.experimental.opentelemetry.wrapApi,
        })
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

export const watchApi = async () => {
  const apiFiles = findApiFiles()

  const esbCtx = await context(getEsbuildOptions(apiFiles))

  return esbCtx.watch()
}

export const transpileApi = async (files: string[]) => {
  return build(getEsbuildOptions(files))
}

function getEsbuildOptions(files: string[]) {
  const rwjsPaths = getPaths()

  return {
    absWorkingDir: rwjsPaths.api.base,
    entryPoints: files,
    platform: 'node' as Platform,
    target: 'node20',
    format: 'cjs' as Format,
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
