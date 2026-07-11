import path from 'node:path'
import { fileURLToPath } from 'node:url'

import * as esbuild from 'esbuild'
import type { BuildOptions as ESBuildOptions } from 'esbuild'
import fg from 'fast-glob'
import fs from 'fs-extra'

export const defaultBuildOptions: ESBuildOptions = {
  outdir: 'dist',

  platform: 'node',
  target: ['node20'],

  format: 'cjs',

  logLevel: 'info',

  // For visualizing dist. See:
  // - https://esbuild.github.io/api/#metafile
  // - https://esbuild.github.io/analyze/
  metafile: true,
}

export const defaultPatterns = ['./src/**/*.{ts,js,tsx,jsx,mts}']
export const defaultIgnorePatterns = [
  '**/__tests__',
  '**/*.test.{ts,js}',
  '**/__fixtures__',
  '**/testUtils',
  '**/__testfixtures__',
  '**/__typetests__',
]

interface BuildOptions {
  cwd?: string
  buildOptions?: ESBuildOptions
  entryPointOptions?: {
    patterns?: string[]
    ignore?: string[]
  }
  metafileName?: string
}

export async function build({
  cwd,
  buildOptions,
  entryPointOptions,
  metafileName,
}: BuildOptions = {}) {
  // Yarn and Nx both set this to the package's root dir path
  cwd ??= process.cwd()

  buildOptions ??= defaultBuildOptions
  metafileName ??= 'meta.json'

  // If the user didn't explicitly provide entryPoints,
  // then we'll use fg to find all the files in `${cwd}/src`
  let entryPoints = buildOptions.entryPoints

  if (!entryPoints) {
    const patterns = entryPointOptions?.patterns ?? defaultPatterns
    const ignore = entryPointOptions?.ignore ?? defaultIgnorePatterns

    entryPoints = await fg(patterns, {
      cwd,
      ignore,
    })
  }

  const result = await esbuild.build({
    entryPoints,
    ...buildOptions,
  })

  if (result.metafile) {
    await fs.writeJSON(path.join(cwd, metafileName), result.metafile, {
      spaces: 2,
    })
  } else {
    console.warn("No metafile found in esbuild's result.")
    console.warn(
      'This is unexpected and probably means something is wrong with the ' +
        'build.',
    )
  }
}

export function buildCjs() {
  return build({
    buildOptions: {
      ...defaultBuildOptions,
      tsconfig: 'tsconfig.cjs.json',
      outdir: 'dist/cjs',
    },
  })
}

export function buildEsm() {
  return build({
    buildOptions: {
      ...defaultBuildOptions,
      tsconfig: 'tsconfig.build.json',
      format: 'esm',
    },
  })
}

export function buildExternalCjs() {
  return build({
    buildOptions: {
      ...defaultBuildOptions,
      tsconfig: 'tsconfig.cjs.json',
      outdir: 'dist/cjs',
      packages: 'external',
    },
  })
}

export function buildExternalEsm() {
  return build({
    buildOptions: {
      ...defaultBuildOptions,
      tsconfig: 'tsconfig.build.json',
      format: 'esm',
      packages: 'external',
    },
  })
}

interface CopyAssetsOptions {
  buildFileUrl: string
  patterns: string[]
  ignore?: string[]
}

export async function copyAssets({
  buildFileUrl,
  patterns,
  ignore,
}: CopyAssetsOptions) {
  const rootDirPath = path.dirname(fileURLToPath(buildFileUrl))
  const srcDirPath = path.join(rootDirPath, 'src')
  const distDirPath = path.join(rootDirPath, 'dist')

  let pathnames = await fg(patterns, {
    absolute: true,
    cwd: srcDirPath,
    ignore: ignore ?? defaultIgnorePatterns,
  })

  // For Windows.
  pathnames = pathnames.map((p) => path.normalize(p))

  for (const pathname of pathnames) {
    const distPathname = pathname.replace(srcDirPath, distDirPath)

    try {
      await fs.mkdirp(path.dirname(distPathname))
      await fs.copyFile(pathname, distPathname)
      console.log(
        `Copied asset into dist: ${path.relative(distDirPath, distPathname)}`,
      )
    } catch (error) {
      console.error(
        `Couldn't copy ${pathname} to ${distPathname}. ` +
          `(Replaced ${srcDirPath} with ${distDirPath} to get the dist pathname.)`,
      )
      throw error
    }
  }
}
