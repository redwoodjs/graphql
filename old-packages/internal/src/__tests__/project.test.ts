import path from 'path'

import { describe, afterAll, it, expect } from 'vitest'

import { getTsConfigs } from '../project'

describe('Retrieves TSConfig settings', () => {
  afterAll(() => {
    delete process.env.RWJS_CWD
  })

  it('Gets config for a TS Project', () => {
    const TS_FIXTURE_PATH = getFixtureDir('test-project')

    process.env.RWJS_CWD = TS_FIXTURE_PATH

    const tsConfiguration = getTsConfigs()

    expect(tsConfiguration.web).not.toBe(null)
    expect(tsConfiguration.api).not.toBe(null)

    // Check some of the values
    expect(tsConfiguration.web.compilerOptions.noEmit).toBe(true)
    expect(tsConfiguration.api.compilerOptions.rootDirs).toEqual([
      './src',
      '../.redwood/types/mirror/api/src',
    ])
  })

  it('Returns null for JS projects', () => {
    const JS_FIXTURE_PATH = getFixtureDir('example-todo-main-with-errors')

    process.env.RWJS_CWD = JS_FIXTURE_PATH

    const tsConfiguration = getTsConfigs()

    expect(tsConfiguration.web).toBe(null)
    expect(tsConfiguration.api).toBe(null)
  })
})

function getFixtureDir(
  name:
    | 'example-todo-main-with-errors'
    | 'example-todo-main'
    | 'empty-project'
    | 'test-project',
) {
  return path.resolve(__dirname, `../../../../__fixtures__/${name}`)
}
