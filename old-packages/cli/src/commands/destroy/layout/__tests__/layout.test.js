globalThis.__dirname = __dirname
vi.mock('fs-extra')
vi.mock('../../../../lib', async (importOriginal) => {
  const originalLib = await importOriginal()
  return {
    ...originalLib,
    generateTemplate: () => '',
  }
})

import fs from 'fs-extra'
import { vol } from 'memfs'
import { vi, beforeEach, afterEach, test, expect } from 'vitest'

import '../../../../lib/test'

import { files } from '../../../generate/layout/layout'
import { tasks } from '../layout'

beforeEach(() => {
  vol.fromJSON(files({ name: 'Blog' }))
  vi.spyOn(console, 'info').mockImplementation(() => {})
  vi.spyOn(console, 'log').mockImplementation(() => {})
})

afterEach(() => {
  vol.reset()
  vi.spyOn(fs, 'unlinkSync').mockClear()
  console.info.mockRestore()
  console.log.mockRestore()
})

test('destroys layout files', async () => {
  const unlinkSpy = vi.spyOn(fs, 'unlinkSync')
  const t = tasks({ componentName: 'layout', filesFn: files, name: 'Blog' })
  t.options.renderer = 'silent'

  return t.run().then(() => {
    const generatedFiles = Object.keys(files({ name: 'Blog' }))
    expect(generatedFiles.length).toEqual(unlinkSpy.mock.calls.length)
    generatedFiles.forEach((f) => expect(unlinkSpy).toHaveBeenCalledWith(f))
  })
})

test('destroys layout files with stories and tests', async () => {
  vol.fromJSON(files({ name: 'Blog', stories: true, tests: true }))
  const unlinkSpy = vi.spyOn(fs, 'unlinkSync')
  const t = tasks({
    componentName: 'layout',
    filesFn: files,
    name: 'Blog',
    stories: true,
    tests: true,
  })
  t.options.renderer = 'silent'

  return t.run().then(() => {
    const generatedFiles = Object.keys(
      files({ name: 'Blog', stories: true, tests: true }),
    )
    expect(generatedFiles.length).toEqual(unlinkSpy.mock.calls.length)
    generatedFiles.forEach((f) => expect(unlinkSpy).toHaveBeenCalledWith(f))
  })
})
