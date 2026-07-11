import path from 'path'

import { describe, beforeAll, afterAll, it, expect } from 'vitest'

import { getDuplicateRoutes, warningForDuplicateRoutes } from '../routes'

const FIXTURE_PATH_EMPTY_PROJECT = path.resolve(
  __dirname,
  '../../../../__fixtures__/empty-project',
)

const FIXTURE_PATH_EXAMPLE = path.resolve(
  __dirname,
  '../../../../__fixtures__/example-todo-main',
)

const FIXTURE_PATH_EXAMPLE_WITH_ERRORS = path.resolve(
  __dirname,
  '../../../../__fixtures__/example-todo-main-with-errors',
)

const FIXTURE_PATH_TEST_PROJECT = path.resolve(
  __dirname,
  '../../../../__fixtures__/test-project',
)

describe('Routes within the empty project', () => {
  beforeAll(() => {
    process.env.RWJS_CWD = FIXTURE_PATH_EMPTY_PROJECT
  })
  afterAll(() => {
    delete process.env.RWJS_CWD
  })

  it('Detects no duplicate routes', () => {
    expect(getDuplicateRoutes()).toStrictEqual([])
  })

  it('Produces the correct warning message', () => {
    expect(warningForDuplicateRoutes()).toBe('')
  })
})

describe('Routes within the example todo project', () => {
  beforeAll(() => {
    process.env.RWJS_CWD = FIXTURE_PATH_EXAMPLE
  })
  afterAll(() => {
    delete process.env.RWJS_CWD
  })

  it('Detects no duplicate routes', () => {
    expect(getDuplicateRoutes()).toStrictEqual([])
  })

  it('Produces the correct warning message', () => {
    expect(warningForDuplicateRoutes()).toBe('')
  })
})

describe('Routes within the example todo with errors project', () => {
  beforeAll(() => {
    process.env.RWJS_CWD = FIXTURE_PATH_EXAMPLE_WITH_ERRORS
  })
  afterAll(() => {
    delete process.env.RWJS_CWD
  })

  it('Detects duplicate root routes', () => {
    expect(getDuplicateRoutes()).toStrictEqual([
      { name: 'home', page: 'HomePage', path: '/' },
      { name: 'home', page: 'HomePage', path: '/' },
    ])
  })

  it('Produces the correct warning message', () => {
    expect(warningForDuplicateRoutes()).toMatch(
      /Warning: 2 duplicate routes have been detected, only the route\(s\) closest to the top of the file will be used.+\n.+Name: \"home\", Path: \"\/\", Page: \"HomePage\"\n.+Name: \"home\", Path: \"\/\", Page: \"HomePage\"/,
    )
  })
})

describe('Routes within the test project', () => {
  beforeAll(() => {
    process.env.RWJS_CWD = FIXTURE_PATH_TEST_PROJECT
  })
  afterAll(() => {
    delete process.env.RWJS_CWD
  })

  it('Detects no duplicate routes', () => {
    expect(getDuplicateRoutes()).toStrictEqual([])
  })

  it('Produces the correct warning message', () => {
    expect(warningForDuplicateRoutes()).toBe('')
  })
})
