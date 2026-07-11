globalThis.__dirname = __dirname
// Load shared mocks
import '../../../../lib/test'

import path from 'path'

import { describe, it, expect, test } from 'vitest'
import yargs from 'yargs/yargs'

import * as functionGenerator from '../function'

// Should be refactored as it's repeated
type WordFilesType = { [key: string]: string }

describe('Single word default files', async () => {
  const singleWordDefaultFiles: WordFilesType = await functionGenerator.files({
    name: 'foo',
    tests: true,
  })

  it('returns tests, scenario and function file', () => {
    const fileNames = Object.keys(singleWordDefaultFiles)
    expect(fileNames.length).toEqual(3)

    expect(fileNames).toEqual(
      expect.arrayContaining([
        expect.stringContaining('foo.js'),
        expect.stringContaining('foo.test.js'),
        expect.stringContaining('foo.scenarios.js'),
      ]),
    )
  })

  it('creates a single word function file', () => {
    expect(
      singleWordDefaultFiles[
        path.normalize('/path/to/project/api/src/functions/foo/foo.js')
      ],
    ).toMatchSnapshot()

    expect(
      singleWordDefaultFiles[
        path.normalize('/path/to/project/api/src/functions/foo/foo.test.js')
      ],
    ).toMatchSnapshot('Test snapshot')

    expect(
      singleWordDefaultFiles[
        path.normalize(
          '/path/to/project/api/src/functions/foo/foo.scenarios.js',
        )
      ],
    ).toMatchSnapshot('Scenario snapshot')
  })
})

test('Keeps Function in name', () => {
  // @ts-expect-error Not sure how to pass generic to yargs here
  const { name } = yargs()
    .command('function <name>', false, functionGenerator.builder)
    .parse('function BazingaFunction')

  expect(name).toEqual('BazingaFunction')
})

test('creates a multi word function file', async () => {
  const multiWordDefaultFiles = await functionGenerator.files({
    name: 'send-mail',
  })

  expect(
    multiWordDefaultFiles[
      path.normalize('/path/to/project/api/src/functions/sendMail/sendMail.js')
    ],
  ).toMatchSnapshot()
})

test('creates a .js file if --javascript=true', async () => {
  const javascriptFiles = await functionGenerator.files({
    name: 'javascript-function',
  })

  expect(
    javascriptFiles[
      path.normalize(
        '/path/to/project/api/src/functions/javascriptFunction/javascriptFunction.js',
      )
    ],
  ).toMatchSnapshot()
  // ^ JS-function-args should be stripped of their types and consequently the unused 'aws-lamda' import removed.
  // https://babeljs.io/docs/en/babel-plugin-transform-typescript
})

test('creates a .ts file if --typescript=true', async () => {
  const typescriptFiles = await functionGenerator.files({
    name: 'typescript-function',
    typescript: true,
  })

  const fileNames = Object.keys(typescriptFiles)
  expect(fileNames.length).toEqual(3)

  expect(fileNames).toEqual(
    expect.arrayContaining([
      expect.stringContaining('typescriptFunction.ts'),
      expect.stringContaining('typescriptFunction.test.ts'),
      expect.stringContaining('typescriptFunction.scenarios.ts'),
    ]),
  )

  expect(
    typescriptFiles[
      path.normalize(
        '/path/to/project/api/src/functions/typescriptFunction/typescriptFunction.ts',
      )
    ],
  ).toMatchSnapshot()
  // ^ TS-functions, on the other hand, retain the 'aws-lamda' import and type-declartions.
})
