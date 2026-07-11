import fs from 'fs'
import path from 'path'

import * as babel from '@babel/core'

import { getPaths } from '@redwoodjs/project-config'

import babelRoutesAutoLoader from '../babel-plugin-redwood-routes-auto-loader'

const transform = (filename: string) => {
  const code = fs.readFileSync(filename, 'utf-8')
  return babel.transform(code, {
    filename,
    presets: ['@babel/preset-react'],
    plugins: [[babelRoutesAutoLoader]],
  })
}

describe('mulitiple files ending in Page.{js,jsx,ts,tsx}', () => {
  const FAILURE_FIXTURE_PATH = path.resolve(
    __dirname,
    './__fixtures__/route-auto-loader/failure',
  )

  beforeAll(() => {
    process.env.RWJS_CWD = FAILURE_FIXTURE_PATH
  })

  afterAll(() => {
    delete process.env.RWJS_CWD
  })

  test('Fails with appropriate message', () => {
    expect(() => {
      transform(getPaths().web.routes)
    }).toThrow(
      "Unable to find only a single file ending in 'Page.{js,jsx,ts,tsx}' " +
        "in the following page directories: 'HomePage'",
    )
  })
})

describe('page auto loader correctly imports pages', () => {
  const FIXTURE_PATH = path.resolve(
    __dirname,
    '../../../../../__fixtures__/example-todo-main/',
  )

  let result: babel.BabelFileResult | null

  beforeAll(() => {
    process.env.RWJS_CWD = FIXTURE_PATH
    result = transform(getPaths().web.routes)
  })

  afterAll(() => {
    delete process.env.RWJS_CWD
  })

  test('Pages get both a LazyComponent and a prerenderLoader', () => {
    expect(result?.code).toContain(`const HomePage = {
  name: "HomePage",
  prerenderLoader: name => ({
    default: globalThis.__REDWOOD__PRERENDER_PAGES[name]
  }),
  LazyComponent: lazy(() => import("./pages/HomePage/HomePage"))
`)
  })

  test('Already imported pages are left alone.', () => {
    expect(result?.code).toContain(`import FooPage from 'src/pages/FooPage'`)
  })

  test('RSC specific code should not be added', () => {
    expect(result?.code).not.toContain('DummyComponent')
    expect(result?.code).not.toContain('= () => {}')
  })
})
