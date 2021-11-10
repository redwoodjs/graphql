import fs from 'fs'
import path from 'path'

import {
  prebuildApiFiles,
  cleanApiBuild,
  generateProxyFilesForNestedFunction,
} from '../build/api'
import { getApiSideBabelConfigPath } from '../build/babel/api'
import { findApiFiles } from '../files'
import { ensurePosixPath } from '../paths'

const FIXTURE_PATH = path.resolve(
  __dirname,
  '../../../../__fixtures__/example-todo-main'
)

const cleanPaths = (p) => {
  return ensurePosixPath(path.relative(FIXTURE_PATH, p))
}

const fullPath = (p) => {
  return path.join(FIXTURE_PATH, p)
}

// Fixtures, filled in beforeAll
let prebuiltFiles
let relativePaths

beforeAll(() => {
  process.env.RWJS_CWD = FIXTURE_PATH
  cleanApiBuild()

  const apiFiles = findApiFiles()
  prebuiltFiles = prebuildApiFiles(apiFiles)

  relativePaths = prebuiltFiles
    .filter((x) => typeof x !== 'undefined')
    .map(cleanPaths)
})
afterAll(() => {
  delete process.env.RWJS_CWD
})

test('api files are prebuilt', () => {
  // Builds non-nested functions
  expect(relativePaths).toContain(
    '.redwood/prebuild/api/src/functions/graphql.js'
  )

  // Builds graphql folder
  expect(relativePaths).toContain(
    '.redwood/prebuild/api/src/graphql/todos.sdl.js'
  )

  // Builds nested function
  expect(relativePaths).toContain(
    '.redwood/prebuild/api/src/functions/nested/nested.js'
  )
})

describe("Should create a 'proxy' function for nested functions", () => {
  it('Handles functions nested with the same name', () => {
    const [buildPath, reExportPath] = generateProxyFilesForNestedFunction(
      fullPath('.redwood/prebuild/api/src/functions/nested/nested.js')
    )

    // Hidden path in the _nestedFunctions folder
    expect(cleanPaths(buildPath)).toBe(
      '.redwood/prebuild/api/src/_nestedFunctions/nested/nested.js'
    )

    // Proxy/reExport function placed in the function directory
    expect(cleanPaths(reExportPath)).toBe(
      '.redwood/prebuild/api/src/functions/nested.js'
    )

    const reExportContent = fs.readFileSync(reExportPath, 'utf-8')
    expect(reExportContent).toMatchInlineSnapshot(
      `"export * from '../_nestedFunctions/nested/nested';"`
    )
  })

  it('Handles folders with an index file', () => {
    const [buildPath, reExportPath] = generateProxyFilesForNestedFunction(
      fullPath('.redwood/prebuild/api/src/functions/x/index.js')
    )

    // Hidden path in the _build folder
    expect(cleanPaths(buildPath)).toBe(
      '.redwood/prebuild/api/src/_nestedFunctions/x/index.js'
    )

    // Proxy/reExport function placed in the function directory
    expect(cleanPaths(reExportPath)).toBe(
      '.redwood/prebuild/api/src/functions/x.js'
    )

    const reExportContent = fs.readFileSync(reExportPath, 'utf-8')

    expect(reExportContent).toMatchInlineSnapshot(
      `"export * from '../_nestedFunctions/x';"`
    )
  })

  it('Should not put files that dont match the folder name in dist/functions', () => {
    const [buildPath, reExportPath] = generateProxyFilesForNestedFunction(
      fullPath('.redwood/prebuild/api/src/functions/invalid/x.js')
    )

    // File is transpiled to the _nestedFunctions folder
    expect(cleanPaths(buildPath)).toEqual(
      '.redwood/prebuild/api/src/_nestedFunctions/invalid/x.js'
    )

    // But not exposed as a serverless function
    expect(reExportPath).toBe(undefined)
  })
})

test('api prebuild finds babel.config.js', () => {
  let p = getApiSideBabelConfigPath()
  p = cleanPaths(p)
  expect(p).toEqual('api/babel.config.js')
})

test('api prebuild uses babel config', () => {
  const p = prebuiltFiles.filter((p) => p.endsWith('dog.js')).pop()
  const code = fs.readFileSync(p, 'utf-8') //?
  expect(code).toContain(`import dog from "dog-bless";`)
})

// Still a bit of a mystery why this plugin isn't transforming gql tags
test.skip('api prebuild transforms gql with `babel-plugin-graphql-tag`', () => {
  // babel-plugin-graphql-tag should transpile the "gql" parts of our files,
  // achieving the following:
  // 1. removing the `graphql-tag` import
  // 2. convert the gql syntax into graphql's ast.
  //
  // https://www.npmjs.com/package/babel-plugin-graphql-tag
  const builtFiles = prebuildApiFiles(findApiFiles())
  const p = builtFiles
    .filter((x) => typeof x !== 'undefined')
    .filter((p) => p.endsWith('todos.sdl.js'))
    .pop()

  const code = fs.readFileSync(p, 'utf-8')
  expect(code.includes('import gql from "graphql-tag";')).toEqual(false)
  expect(code.includes('gql`')).toEqual(false)
})

test('Pretranspile polyfills unsupported functionality', () => {
  const p = prebuiltFiles.filter((p) => p.endsWith('polyfill.js')).pop()
  const code = fs.readFileSync(p, 'utf-8')
  expect(code).toContain(
    'import "core-js/modules/esnext.string.replace-all.js"'
  )
})
