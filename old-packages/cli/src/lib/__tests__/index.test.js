global.__dirname = __dirname
vi.mock('@redwoodjs/project-config', async (importOriginal) => {
  const originalProjectConfig = await importOriginal()
  const path = require('path')
  return {
    ...originalProjectConfig,
    getPaths: () => {
      const BASE_PATH = path.join(globalThis.__dirname, 'fixtures')
      return {
        base: BASE_PATH,
        api: {
          db: BASE_PATH, // this folder
        },
      }
    },
  }
})

import path from 'path'

import fs from 'fs-extra'
import { vi, test, expect, describe } from 'vitest'

import * as index from '../index'

test('nameVariants returns a single word cased variables', () => {
  const names = ['Home', 'home']

  names.forEach((name) => {
    const vars = index.nameVariants(name)

    expect(vars.pascalName).toEqual('Home')
    expect(vars.camelName).toEqual('home')
    expect(vars.singularPascalName).toEqual('Home')
    expect(vars.pluralPascalName).toEqual('Homes')
    expect(vars.singularCamelName).toEqual('home')
    expect(vars.pluralCamelName).toEqual('homes')
    expect(vars.singularParamName).toEqual('home')
    expect(vars.pluralParamName).toEqual('homes')
    expect(vars.singularConstantName).toEqual('HOME')
    expect(vars.pluralConstantName).toEqual('HOMES')
  })
})

test('nameVariants returns a multi word cased variables', () => {
  const names = ['FooBar', 'fooBar', 'foo_bar', 'foo-bar', 'FOOBar']

  names.forEach((name) => {
    const vars = index.nameVariants(name)

    expect(vars.pascalName).toEqual('FooBar')
    expect(vars.camelName).toEqual('fooBar')
    expect(vars.singularPascalName).toEqual('FooBar')
    expect(vars.pluralPascalName).toEqual('FooBars')
    expect(vars.singularCamelName).toEqual('fooBar')
    expect(vars.pluralCamelName).toEqual('fooBars')
    expect(vars.singularParamName).toEqual('foo-bar')
    expect(vars.pluralParamName).toEqual('foo-bars')
  })
})

test('generateTemplate returns a lodash-templated string', async () => {
  const output = await index.generateTemplate(
    path.join(__dirname, 'fixtures', 'text.txt'),
    {
      name: 'amet',
      noun: 'world',
    },
  )

  expect(output).toEqual(`Lorem ipsum dolar sit amet\nHello, world!\n`)
})

// Be careful when editing the code.js fixture as the prettifier.config.js will cause it to get
// prettified and then it already match the expected output, with no changes
test('generateTemplate returns prettified JS code', async () => {
  const output = await index.generateTemplate(
    path.join(__dirname, 'fixtures', 'code.js'),
    {
      name: 'fox',
      foo: 'dog',
    },
  )

  expect(output).toEqual(
    `const line1 = 'The quick brown foxes jumps over the lazy dog.'\nconst line2 = 'Sphinx of black quartz, judge my vow.'\n`,
  )
})

describe('usingVSCode', () => {
  test('return false when .vscode folder does not exist', () => {
    const output = index.usingVSCode()

    expect(output).toEqual(false)
  })

  test('return true when .vscode folder does exist', () => {
    const BASE_PATH = path.join(globalThis.__dirname, 'fixtures')
    fs.mkdirSync(path.join(BASE_PATH, '.vscode'))

    const output = index.usingVSCode()

    expect(output).toEqual(true)

    fs.rmdirSync(path.join(BASE_PATH, '.vscode'))
  })
})
