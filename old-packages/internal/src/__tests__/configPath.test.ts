import path from 'path'

import { vi, describe, it, expect, afterAll, beforeAll } from 'vitest'

import { getConfigPath } from '@redwoodjs/project-config'

describe('getConfigPath', () => {
  it('throws an error when not in a project', () => {
    expect(getConfigPath).toThrowErrorMatchingInlineSnapshot(
      `[Error: Could not find a "redwood.toml" file, are you sure you're in a Redwood project?]`,
    )
  })

  describe('using RWJS_CWD environment variable', () => {
    const RWJS_CWD = process.env.RWJS_CWD
    const FIXTURE_BASEDIR = path.join(
      __dirname,
      '..',
      '..',
      '..',
      '..',
      '__fixtures__',
      'test-project',
    )
    afterAll(() => {
      process.env.RWJS_CWD = RWJS_CWD
    })

    it('finds the correct config path when at base directory', () => {
      process.env.RWJS_CWD = FIXTURE_BASEDIR
      expect(getConfigPath()).toBe(path.join(FIXTURE_BASEDIR, 'redwood.toml'))
    })

    it('finds the correct config path when inside a project directory', () => {
      process.env.RWJS_CWD = path.join(
        FIXTURE_BASEDIR,
        'web',
        'src',
        'pages',
        'AboutPage',
      )
      expect(getConfigPath()).toBe(path.join(FIXTURE_BASEDIR, 'redwood.toml'))
    })
  })

  describe('using cwd', () => {
    const RWJS_CWD = process.env.RWJS_CWD
    const FIXTURE_BASEDIR = path.join(
      __dirname,
      '..',
      '..',
      '..',
      '..',
      '__fixtures__',
      'test-project',
    )
    beforeAll(() => {
      delete process.env.RWJS_CWD
    })
    afterAll(() => {
      process.env.RWJS_CWD = RWJS_CWD
      vi.restoreAllMocks()
    })

    it('finds the correct config path when at base directory', () => {
      const spy = vi.spyOn(process, 'cwd')
      spy.mockReturnValue(FIXTURE_BASEDIR)
      expect(getConfigPath()).toBe(path.join(FIXTURE_BASEDIR, 'redwood.toml'))
    })

    it('finds the correct config path when inside a project directory', () => {
      const spy = vi.spyOn(process, 'cwd')
      spy.mockReturnValue(
        path.join(FIXTURE_BASEDIR, 'web', 'src', 'pages', 'AboutPage'),
      )
      expect(getConfigPath()).toBe(path.join(FIXTURE_BASEDIR, 'redwood.toml'))
    })
  })
})
