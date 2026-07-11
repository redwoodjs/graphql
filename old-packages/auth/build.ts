import { readFileSync, writeFileSync } from 'node:fs'

import type { PackageJson } from 'type-fest'
import { $ } from 'zx'

import { build, defaultBuildOptions } from '@redwoodjs/framework-tools'

// ESM build
await build({
  buildOptions: {
    ...defaultBuildOptions,
    tsconfig: 'tsconfig.build.json',
    format: 'esm',
    packages: 'external',
  },
})

// CJS build
await build({
  buildOptions: {
    ...defaultBuildOptions,
    tsconfig: 'tsconfig.build.json',
    outdir: 'dist/cjs',
    packages: 'external',
  },
})

// Place a package.json file with `type: commonjs` in the dist/cjs folder so
// that all .js files are treated as CommonJS files.
writeFileSync('dist/cjs/package.json', JSON.stringify({ type: 'commonjs' }))

// Place a package.json file with `type: module` in the dist folder so that
// all .js files are treated as ES Module files.
writeFileSync('dist/package.json', JSON.stringify({ type: 'module' }))

// Finally we need to also produce CJS type definitions
//
// The best way[1] to do this is to (temporarily) change the "type" in
// package.json to "commonjs" and run tsc with our tsconfig.build-cjs.json
// config file.
// It's possible to run TSC programmatically[2] but it's much easier to just
// shell out to the CLI.
//
// [1]: https://github.com/arethetypeswrong/arethetypeswrong.github.io/issues/21#issuecomment-1494618930
// [2]: https://github.com/Microsoft/TypeScript/wiki/Using-the-Compiler-API

await $`cp package.json package.json.bak`

const packageJson: PackageJson = JSON.parse(
  readFileSync('./package.json', 'utf-8'),
)
packageJson.type = 'commonjs'
writeFileSync('./package.json', JSON.stringify(packageJson, null, 2))

try {
  await $`yarn build:types-cjs`
} catch (e) {
  console.error('Could not build CJS types')
  console.error(e)

  // Restore the original package.json
  await $`mv package.json.bak package.json`

  process.exit(1)
}

await $`mv package.json.bak package.json`
