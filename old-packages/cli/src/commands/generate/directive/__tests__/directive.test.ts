globalThis.__dirname = __dirname
// Load shared mocks
import '../../../../lib/test'

import path from 'path'

import { test, expect } from 'vitest'
import yargs from 'yargs/yargs'

import * as directive from '../directive'

test('creates a JavaScript validator directive', async () => {
  const output = await directive.files({
    name: 'require-admin', // checking camel casing too!
    typescript: false,
    tests: true,
    type: 'validator',
  })

  const expectedOutputPath = path.normalize(
    '/path/to/project/api/src/directives/requireAdmin/requireAdmin.js',
  )
  const expectedTestOutputPath = path.normalize(
    '/path/to/project/api/src/directives/requireAdmin/requireAdmin.test.js',
  )

  expect(Object.keys(output)).toContainEqual(expectedOutputPath)
  expect(Object.keys(output)).toContainEqual(expectedTestOutputPath)
  expect(output[expectedOutputPath]).toMatchSnapshot('js directive')
  expect(output[expectedTestOutputPath]).toMatchSnapshot('js directive test')
})

test('creates a TypeScript transformer directive', async () => {
  const output = await directive.files({
    name: 'bazinga-foo_bar', // checking camel casing too!
    typescript: true,
    tests: true,
    type: 'transformer',
  })

  const expectedOutputPath = path.normalize(
    '/path/to/project/api/src/directives/bazingaFooBar/bazingaFooBar.ts',
  )
  const expectedTestOutputPath = path.normalize(
    '/path/to/project/api/src/directives/bazingaFooBar/bazingaFooBar.test.ts',
  )

  expect(Object.keys(output)).toContainEqual(expectedOutputPath)
  expect(Object.keys(output)).toContainEqual(expectedTestOutputPath)
  expect(output[expectedOutputPath]).toMatchSnapshot('ts directive')
  expect(output[expectedTestOutputPath]).toMatchSnapshot('ts directive test')
})

test('keeps Directive in name', () => {
  const { name } = yargs()
    .command('directive <name>', false, directive.builder)
    .parse('directive BazingaDirective')

  expect(name).toEqual('BazingaDirective')
})
