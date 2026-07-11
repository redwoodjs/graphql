import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import type { PackageJson } from 'type-fest'
import { $ } from 'zx'

/**
 * This function will run `yarn build:types-cjs` to generate the CJS type
 * definitions.
 *
 * It will also temporarily change the package.json file to have
 *`"type": "commonjs"`. This is the most reliable way to generate CJS type
 * definitions[1]. It will revert the package.json file back to its original
 * state after the types have been generated - even if an error occurs.
 *
 * [1]: https://github.com/arethetypeswrong/arethetypeswrong.github.io/issues/21#issuecomment-1494618930
 */
export async function generateTypesCjs() {
  await $`cp package.json package.json.bak`

  const packageJson: PackageJson = JSON.parse(
    readFileSync('./package.json', 'utf-8'),
  )
  packageJson.type = 'commonjs'
  writeFileSync('./package.json', JSON.stringify(packageJson, null, 2))

  try {
    await $`yarn build:types-cjs`
  } catch (e: any) {
    console.error('---- Error building CJS types ----')
    process.exitCode = e.exitCode
    throw new Error(e)
  } finally {
    await $`mv package.json.bak package.json`
  }
}

/**
 * This function will run `yarn build:types` to generate the ESM type
 * definitions.
 */
export async function generateTypesEsm() {
  try {
    await $`yarn build:types`
  } catch (e: any) {
    console.error('---- Error building ESM types ----')
    process.exitCode = e.exitCode
    throw new Error(e)
  }
}

/**
 * This function will insert a package.json file with "type": "commonjs" in the
 * CJS build directory. This is necessary for the CJS build to be recognized as
 * CommonJS modules when the root package.json file has `"type": "module"`.
 */
export async function insertCommonJsPackageJson({
  buildFileUrl,
  cjsDir = 'dist/cjs',
}: {
  buildFileUrl: string
  cjsDir?: string
}) {
  const packageDir = path.dirname(fileURLToPath(buildFileUrl))
  const packageJsonPath = path.join(packageDir, cjsDir, 'package.json')
  writeFileSync(packageJsonPath, JSON.stringify({ type: 'commonjs' }))
}
