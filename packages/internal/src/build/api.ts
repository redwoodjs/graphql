import fs from 'fs'
import path from 'path'

import { transform, TransformOptions } from '@babel/core'
import { buildSync } from 'esbuild'
import rimraf from 'rimraf'

import { findApiFiles } from '../files'
import { getPaths } from '../paths'

import { getApiSideBabelConfigPath, getApiSideBabelPlugins } from './babel/api'

export const buildApi = () => {
  // TODO: Be smarter about caching and invalidating files,
  // but right now we just delete everything.
  cleanApiBuild()

  const srcFiles = findApiFiles()
  const prebuiltFiles = prebuildApiFiles(srcFiles).filter(
    (x) => typeof x !== 'undefined'
  ) as string[]

  return transpileApi(prebuiltFiles)
}

export const cleanApiBuild = () => {
  const rwjsPaths = getPaths()
  rimraf.sync(rwjsPaths.api.dist)
  rimraf.sync(path.join(rwjsPaths.generated.prebuild, 'api'))
}

/**
 * Remove RedwoodJS "magic" from a user's code leaving JavaScript behind.
 */
export const prebuildApiFiles = (srcFiles: string[]) => {
  const rwjsPaths = getPaths()
  const plugins = getApiSideBabelPlugins()

  return srcFiles.map((srcPath) => {
    let dstPath = path.relative(rwjsPaths.base, srcPath)
    dstPath = path.join(rwjsPaths.generated.prebuild, dstPath)
    dstPath = dstPath.replace(/\.(ts)$/, '.js') // TODO: Figure out a better way to handle extensions

    const result = prebuildFile(srcPath, dstPath, plugins)
    if (!result?.code) {
      // TODO: Figure out a better way to return these programatically.
      console.warn('Error:', srcPath, 'could not prebuilt.')

      return undefined
    }

    fs.mkdirSync(path.dirname(dstPath), { recursive: true })
    fs.writeFileSync(dstPath, result.code)
    return dstPath
  })
}

// TODO: This can be shared between the api and web sides, but web
// needs to determine plugins on a per-file basis for web side.
export const prebuildFile = (
  srcPath: string,
  // we need to know dstPath as well
  // so we can generate an inline, relative sourcemap
  dstPath: string,
  plugins: TransformOptions['plugins']
) => {
  const code = fs.readFileSync(srcPath, 'utf-8')
  const result = transform(code, {
    cwd: getPaths().api.base,
    babelrc: false,
    filename: srcPath,
    configFile: getApiSideBabelConfigPath(),
    // we set the sourceFile (for the sourcemap) as a correct, relative path
    // this is why this function (prebuildFile) must know about the dstPath
    sourceFileName: path.relative(path.dirname(dstPath), srcPath),
    // we need inline sourcemaps at this level
    // because this file will eventually be fed to esbuild
    // when esbuild finds an inline sourcemap, it tries to "combine" it
    // so the final sourcemap (the one that esbuild generates) combines both mappings
    sourceMaps: 'inline',
    plugins,
  })
  return result
}

export const transpileApi = (files: string[], options = {}) => {
  const rwjsPaths = getPaths()

  return buildSync({
    absWorkingDir: rwjsPaths.api.base,
    entryPoints: files,
    platform: 'node',
    target: 'node12.21', // AWS Lambdas support NodeJS 12.x and 14.x, but what does Netlify Target?
    format: 'cjs',
    bundle: false,
    outdir: rwjsPaths.api.dist,
    // setting this to 'true' will generate an external sourcemap x.js.map
    // AND set the sourceMappingURL comment
    // (setting it to 'external' will ONLY generate the file, but won't add the comment)
    sourcemap: true,
    ...options,
  })
}
