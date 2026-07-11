import { writeFileSync } from 'node:fs'

import * as esbuild from 'esbuild'

import {
  build,
  defaultBuildOptions,
  defaultIgnorePatterns,
} from '@redwoodjs/framework-tools'

// CJS build
/**
 * Notes:
 * - we don't build the webpack entry point in CJS, because it produces a double wrapped module
 * instead we use the ESM version (see ./webpackEntry in package.json). The double wrapping happens
 * when you set type: module in package.json, and occurs on the App & Routes import from the project.
 * - we build bins in CJS, until projects fully switch to ESM (or we produce .mts files) this is probably
 * the better option
 */
await build({
  entryPointOptions: {
    ignore: [
      ...defaultIgnorePatterns,
      'src/__typetests__/**',
      'src/bundled/**', // <-- ⭐
    ],
  },
  buildOptions: {
    ...defaultBuildOptions,
    tsconfig: 'tsconfig.build.json',
    outdir: 'dist/cjs',
    packages: 'external',
  },
})

// ESM build
await build({
  entryPointOptions: {
    // @NOTE: building the cjs bins only...
    // I haven't tried esm bins yet...
    ignore: [...defaultIgnorePatterns, 'src/bins/**', 'src/__typetests__/**'],
  },
  buildOptions: {
    ...defaultBuildOptions,
    tsconfig: 'tsconfig.build.json',
    format: 'esm',
    packages: 'external',
  },
})

// Workaround for apollo-client-upload being ESM-only
// In ESM version of rwjs/web, we don't actually bundle it, we just reexport.
// In the CJS version (see ⭐ above), we bundle it below.
// This only ever gets used during prerender, so bundle size is not a concern.
await esbuild.build({
  entryPoints: ['src/bundled/*'],
  outdir: 'dist/cjs/bundled',
  format: 'cjs',
  bundle: true,
  logLevel: 'info',
  tsconfig: 'tsconfig.build.json',
})

// Place a package.json file with `type: commonjs` in the dist/cjs folder so
// that all .js files are treated as CommonJS files.
writeFileSync('dist/cjs/package.json', JSON.stringify({ type: 'commonjs' }))

// Place a package.json file with `type: module` in the dist folder so that
// all .js files are treated as ES Module files.
writeFileSync('dist/package.json', JSON.stringify({ type: 'module' }))

// tsc doesn't generate any types here, because the source file is a javascript
// file. But it's really simple. It doesn't have any exports. So we can just
// write the type definitions ourselves
writeFileSync('dist/entry/index.d.ts', 'export {}\n')
