import { writeFileSync } from 'node:fs'

import { commonjs } from '@hyrious/esbuild-plugin-commonjs'
import * as esbuild from 'esbuild'

import {
  build,
  defaultBuildOptions,
  defaultIgnorePatterns,
} from '@redwoodjs/framework-tools'

// CJS Build
await build({
  entryPointOptions: {
    ignore: [...defaultIgnorePatterns, '**/bundled'],
  },
  buildOptions: {
    ...defaultBuildOptions,
    tsconfig: 'tsconfig.build.json',
    outdir: 'dist/cjs',
    packages: 'external',
  },
})

// ESM Build
await build({
  entryPointOptions: {
    ignore: [...defaultIgnorePatterns, '**/bundled'],
  },
  buildOptions: {
    ...defaultBuildOptions,
    tsconfig: 'tsconfig.build.json',
    format: 'esm',
    packages: 'external',
  },
})

// We bundle some react packages with the "react-server" condition
// so that we don't need to specify it at runtime.
await esbuild.build({
  entryPoints: ['src/bundled/*'],
  outdir: 'dist/bundled',
  format: 'esm',
  bundle: true,
  conditions: ['react-server'],
  platform: 'node',
  target: ['node20'],
  // Without this plugin, we get "Error: Dynamic require of "util" is not
  // supported" when trying to run the built files. This plugin will "just
  // rewrite that file to replace "require(node-module)" to a toplevel static
  // import statement." (see issue)
  // https://github.com/evanw/esbuild/issues/2113
  // https://github.com/evanw/esbuild/pull/2067
  plugins: [commonjs()],
  logLevel: 'info',
  tsconfig: 'tsconfig.build.json',
})

// Place a package.json file with `type: commonjs` in the dist/cjs folder so
// that all .js files are treated as CommonJS files.
writeFileSync('dist/cjs/package.json', JSON.stringify({ type: 'commonjs' }))

// Place a package.json file with `type: module` in the dist folder so that
// all .js files are treated as ES Module files.
writeFileSync('dist/package.json', JSON.stringify({ type: 'module' }))

// Add CommonJS types by creating common JS types. Using a .d.ts file, because
// .d.cts files don't auto resolve
// Notice I haven't specified the types in package.json for these - it's
// following the naming conversion TSC wants.
writeFileSync('dist/cjs/index.d.ts', 'export type * from "../index.d.ts"')
writeFileSync(
  'dist/cjs/buildFeServer.d.ts',
  'export type * from "../buildFeServer.d.ts"',
)
writeFileSync('dist/cjs/client.d.ts', 'export type * from "../client.d.ts"')
writeFileSync(
  'dist/cjs/clientSsr.d.ts',
  'export type * from "../clientSsr.d.ts"',
)
writeFileSync(
  'dist/cjs/ClientRouter.d.ts',
  'export type * from "../ClientRouter.d.ts"',
)
writeFileSync(
  'dist/cjs/build/build.d.ts',
  'export type * from "../../build/build.d.ts"',
)
