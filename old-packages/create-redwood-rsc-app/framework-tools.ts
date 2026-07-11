import type { BuildOptions as ESBuildOptions } from 'esbuild'

import * as esbuild from 'esbuild'
import fg from 'fast-glob'
import fs from 'fs-extra'
import path from 'node:path'

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
]

interface BuildOptions {
  buildOptions?: ESBuildOptions
  cwd?: string
  entryPointOptions?: {
    ignore?: string[]
    patterns?: string[]
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
