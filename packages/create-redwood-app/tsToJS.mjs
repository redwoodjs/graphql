#!/usr/bin/env node
/* eslint-env node */

import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { transformFileSync } from '@babel/core'
import fg from 'fast-glob'
import fs from 'fs-extra'
import { format } from 'prettier'

const [TS_TEMPLATE_FILEPATH, JS_TEMPLATE_FILEPATH] = [
  new URL('./templates/ts', import.meta.url),
  new URL('./templates/js', import.meta.url),
].map(fileURLToPath)

const { default: prettierConfig } = await import(
  new URL('./templates/ts/prettier.config.js', import.meta.url)
)

fs.copySync(TS_TEMPLATE_FILEPATH, JS_TEMPLATE_FILEPATH)

console.group('Transforming TS files to TS')

// Get all TS files in the template.
const filePaths = fg.sync('{api,web,scripts}/src/**/*.{ts,tsx}', {
  cwd: JS_TEMPLATE_FILEPATH,
  absolute: true,
})

// Transform every file in turn.
for (const filePath of filePaths) {
  console.log('Transforming', filePath)

  const result = transformFileSync(filePath, {
    cwd: TS_TEMPLATE_FILEPATH,
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
    throw new Error(`Babel transform for ${filePath} failed`)
  }

  const formattedCode = format(result.code, {
    ...prettierConfig,
    parser: 'babel',
  })

  fs.writeFileSync(
    filePath.replace('.tsx', '.js').replace('.ts', '.js'),
    formattedCode,
    'utf-8'
  )

  fs.rmSync(filePath)
}

console.groupEnd()
console.log()

console.group('Transforming tsconfig files to jsconfig')

// Handle config files.
const TSConfigFilePaths = fg.sync('{api,web,scripts}/**/tsconfig.json', {
  cwd: JS_TEMPLATE_FILEPATH,
  absolute: true,
})

for (const tsConfigFilePath of TSConfigFilePaths) {
  console.log('Transforming', tsConfigFilePath)

  const jsConfigFilePath = path.join(
    path.dirname(tsConfigFilePath),
    'jsconfig.json'
  )

  fs.renameSync(tsConfigFilePath, jsConfigFilePath)

  const jsConfig = fs.readJSONSync(jsConfigFilePath)
  delete jsConfig.allowJs

  fs.writeJSONSync(jsConfigFilePath, jsConfig, { spaces: 2 })
}

console.groupEnd()
