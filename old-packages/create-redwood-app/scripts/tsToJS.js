/* eslint-env node */

import { fileURLToPath } from 'node:url'

import { transformFileSync } from '@babel/core'
import { format } from 'prettier'
import { fs, glob, path } from 'zx'

const TS_TEMPLATE_PATH = fileURLToPath(
  new URL('../templates/ts', import.meta.url),
)

// Remove `node_modules`, `.yarn/install-state.gz`.
console.log('Removing `node_modules` in the TS template')
const tsTemplateNodeModulesPath = path.join(TS_TEMPLATE_PATH, 'node_modules')
await fs.rm(tsTemplateNodeModulesPath, { recursive: true, force: true })

console.log("Removing yarn's `install-state.gz` in the TS template")
const tsTemplateYarnInstallStatePath = path.join(
  TS_TEMPLATE_PATH,
  '.yarn',
  'install-state.gz',
)
await fs.rm(tsTemplateYarnInstallStatePath, { force: true })

// Clean and copy the TS template to the JS template.
const JS_TEMPLATE_PATH = fileURLToPath(
  new URL('../templates/js', import.meta.url),
)

console.log('Removing the JS template')
await fs.rm(JS_TEMPLATE_PATH, { recursive: true, force: true })
console.log('Copying the TS template to the JS template')
await fs.copy(TS_TEMPLATE_PATH, JS_TEMPLATE_PATH)

// Find files and transform.
const filePaths = await glob(['{api,web,scripts}/**/*.{ts,tsx}'], {
  cwd: JS_TEMPLATE_PATH,
  absolute: true,
})

console.group('Transforming files in the JS template')

const { default: prettierConfig } = await import(
  new URL('../templates/ts/prettier.config.js', import.meta.url)
)

for (const filePath of filePaths) {
  console.log(`• ${filePath}`)

  const result = transformFileSync(filePath, {
    cwd: TS_TEMPLATE_PATH,
    configFile: false,
    plugins: [
      [
        '@babel/plugin-transform-typescript',
        {
          isTSX: true,
          allExtensions: true,
        },
      ],
    ],
    retainLines: true,
  })

  if (!result) {
    throw new Error(`Error: Couldn't transform ${filePath}`)
  }

  const formattedCode = await format(result.code, {
    ...prettierConfig,
    parser: 'babel',
  })

  await fs.writeFile(
    filePath.replace('.tsx', '.jsx').replace('.ts', '.js'),
    formattedCode,
    'utf-8',
  )

  await fs.rm(filePath)
}

console.groupEnd()

console.group(
  'Transforming `tsconfig.json`s in the JS template to `jsconfig.json`s',
)

const tsConfigFilePaths = await glob(['{api,web,scripts}/**/tsconfig.json'], {
  cwd: JS_TEMPLATE_PATH,
  absolute: true,
})

for (const tsConfigFilePath of tsConfigFilePaths) {
  console.log(`• ${tsConfigFilePath}`)

  const jsConfigFilePath = path.join(
    path.dirname(tsConfigFilePath),
    'jsconfig.json',
  )

  await fs.rename(tsConfigFilePath, jsConfigFilePath)

  const jsConfig = await fs.readJSON(jsConfigFilePath)

  // This property has no meaning in JS projects.
  delete jsConfig.compilerOptions.allowJs

  await fs.writeJSON(jsConfigFilePath, jsConfig, { spaces: 2 })
}

console.groupEnd()

console.group('Updating file extension in seed.js')

const seedFilePath = path.join(JS_TEMPLATE_PATH, 'scripts', 'seed.js')
const seedFile = fs
  .readFileSync(seedFilePath, 'utf-8')
  .replace('seed.ts', 'seed.js')
fs.writeFileSync(seedFilePath, seedFile)

console.groupEnd()

console.group('Updating lint ignore line in auth.js')

const authFilePath = path.join(JS_TEMPLATE_PATH, 'api', 'src', 'lib', 'auth.js')
const authFile = fs
  .readFileSync(authFilePath, 'utf-8')
  .replace('@typescript-eslint/no-unused-vars', 'no-unused-vars')
fs.writeFileSync(authFilePath, authFile)

console.groupEnd()
