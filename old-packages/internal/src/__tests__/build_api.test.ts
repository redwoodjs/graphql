import fs from 'fs'
import path from 'path'

import * as babel from '@babel/core'
import { beforeAll, test, expect, afterAll } from 'vitest'

import {
  getApiSideBabelPlugins,
  getApiSideDefaultBabelConfig,
  transformWithBabel,
} from '@redwoodjs/babel-config'
import { ensurePosixPath, getPaths } from '@redwoodjs/project-config'

import { cleanApiBuild } from '../build/api'
import { findApiFiles } from '../files'

const FIXTURE_PATH = path.resolve(
  __dirname,
  '../../../../__fixtures__/example-todo-main',
)

// @NOTE: we no longer prebuild files into the .redwood/prebuild folder
// However, prebuilding in the tests is still helpful for us to  validate
// that everything is working as expected.
export const prebuildApiFiles = async (srcFiles: string[]) => {
  const rwjsPaths = getPaths()
  const plugins = getApiSideBabelPlugins()

  return Promise.all(
    srcFiles.map(async (srcPath) => {
      const relativePathFromSrc = path.relative(rwjsPaths.base, srcPath)
      const dstPath = path
        .join(rwjsPaths.generated.prebuild, relativePathFromSrc)
        .replace(/\.(ts)$/, '.js')

      const result = await transformWithBabel(srcPath, plugins)
      if (!result?.code) {
        throw new Error(`Could not prebuild ${srcPath}`)
      }

      fs.mkdirSync(path.dirname(dstPath), { recursive: true })
      fs.writeFileSync(dstPath, result.code)

      return dstPath
    }),
  )
}

const cleanPaths = (p) => {
  return ensurePosixPath(path.relative(FIXTURE_PATH, p))
}

// Fixtures, filled in beforeAll
let prebuiltFiles
let relativePaths

beforeAll(async () => {
  process.env.RWJS_CWD = FIXTURE_PATH
  cleanApiBuild()

  const apiFiles = findApiFiles()
  prebuiltFiles = await prebuildApiFiles(apiFiles)

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
    '.redwood/prebuild/api/src/functions/graphql.js',
  )

  // Builds graphql folder
  expect(relativePaths).toContain(
    '.redwood/prebuild/api/src/graphql/todos.sdl.js',
  )

  // Builds nested function
  expect(relativePaths).toContain(
    '.redwood/prebuild/api/src/functions/nested/nested.js',
  )
})

test('api prebuild uses babel config only from the api side root', () => {
  const p = prebuiltFiles.filter((p) => p.endsWith('dog.js')).pop()
  const code = fs.readFileSync(p, 'utf-8')
  expect(code).toContain(`import dog from "dog-bless";`)

  // Should ignore root babel config
  expect(code).not.toContain(`import kitty from "kitty-purr"`)
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

  if (!p) {
    throw new Error('No built files')
  }

  const code = fs.readFileSync(p, 'utf-8')
  expect(code.includes('import gql from "graphql-tag";')).toEqual(false)
  expect(code.includes('gql`')).toEqual(false)
})

test('jest mock statements also handle', () => {
  const pathToTest = path.join(getPaths().api.services, 'todos/todos.test.js')

  const code = fs.readFileSync(pathToTest, 'utf-8')

  const defaultOptions = getApiSideDefaultBabelConfig()

  // Step 1: prebuild service/todos.test.js
  const outputForJest = babel.transform(code, {
    ...defaultOptions,
    filename: pathToTest,
    cwd: getPaths().api.base,
    // We override the plugins, to match packages/testing/config/jest/api/index.js
    plugins: getApiSideBabelPlugins({ forJest: true }),
  })?.code

  // Step 2: check that output has correct import statement path
  expect(outputForJest).toContain('import dog from "../../lib/dog"')
  // Step 3: check that output has correct jest.mock path
  expect(outputForJest).toContain('jest.mock("../../lib/dog"')
})
