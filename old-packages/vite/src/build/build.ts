import fs from 'node:fs'
import path from 'node:path'

import * as babel from '@babel/core'
import fse from 'fs-extra'
import { transformWithEsbuild } from 'vite'

import type { Flags } from '@redwoodjs/babel-config'
import { getWebSideDefaultBabelConfig } from '@redwoodjs/babel-config'
import { getPaths } from '@redwoodjs/project-config'

export const cleanWebBuild = () => {
  const rwjsPaths = getPaths()
  fse.removeSync(rwjsPaths.web.dist)
  fse.removeSync(path.join(rwjsPaths.generated.prebuild, 'web'))
}

export async function prebuildWebFile(srcPath: string, flags: Flags = {}) {
  const code = fs.readFileSync(srcPath, 'utf-8')
  const config = getWebSideDefaultBabelConfig(flags)
  const result = babel.transform(code, {
    ...config,
    cwd: getPaths().web.base,
    filename: srcPath,
  })

  return result
}

export async function transform(srcPath: string) {
  const code = fs.readFileSync(srcPath, 'utf-8')

  const loader = path.extname(srcPath).match(/^\.m?ts/) ? 'tsx' : 'jsx'
  const transformed = await transformWithEsbuild(code, srcPath, {
    loader,
  })

  return transformed.code
}

/**
 * Remove RedwoodJS "magic" from a user's code leaving JavaScript behind.
 *
 * Currently only used for debugging purposes
 */
export const prebuildWebFiles = async (srcFiles: string[], flags?: Flags) => {
  const rwjsPaths = getPaths()

  const processFile = async (srcPath: string) => {
    const relativePathFromSrc = path.relative(rwjsPaths.base, srcPath)
    const dstPath = path
      .join(rwjsPaths.generated.prebuild, relativePathFromSrc)
      .replace(/\.(ts)$/, '.js')

    try {
      const result = await prebuildWebFile(srcPath, flags)
      if (!result?.code) {
        throw new Error('No code returned from prebuildWebFile')
      }

      fs.mkdirSync(path.dirname(dstPath), { recursive: true })
      fs.writeFileSync(dstPath, result.code)
    } catch {
      console.warn('Error:', srcPath, 'could not prebuilt.')
      return undefined
    }

    return dstPath
  }

  const promises = []
  for (const srcPath of srcFiles) {
    promises.push(processFile(srcPath))
  }
  return await Promise.all(promises)
}

interface BuildOptions {
  verbose?: boolean
}

/**
 * Builds the web side with Vite, but not used in the buildHandler currently
 * because we want to set the process.cwd to web.base
 */
export const buildWeb = async ({ verbose }: BuildOptions) => {
  // @NOTE: Using dynamic import, because vite is still opt-in
  const { build } = await import('vite')
  const viteConfig = getPaths().web.viteConfig

  if (process.cwd() !== getPaths().web.base) {
    throw new Error(
      'Looks like you are running the command from the wrong dir, this can lead to unintended consequences on CSS processing',
    )
  }

  if (!viteConfig) {
    throw new Error('Could not locate your web/vite.config.{js,ts} file')
  }

  return build({
    configFile: viteConfig,
    envFile: false,
    logLevel: verbose ? 'info' : 'warn',
  })
}
