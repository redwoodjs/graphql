globalThis.__dirname = __dirname

vi.mock('fs-extra')
vi.mock('../../../../lib', async (importOriginal) => {
  const originalLib = await importOriginal()
  return {
    ...originalLib,
    generateTemplate: () => '',
  }
})

vi.mock('@redwoodjs/structure', () => {
  return {
    getProject: () => ({
      cells: [{ queryOperationName: undefined }],
    }),
  }
})

import fs from 'fs-extra'
import { vol } from 'memfs'
import { vi, beforeEach, afterEach, test, expect } from 'vitest'

import '../../../../lib/test'

import { files } from '../../../generate/cell/cell'
import { tasks } from '../cell'

beforeEach(() => {
  vi.spyOn(console, 'info').mockImplementation(() => {})
  vi.spyOn(console, 'log').mockImplementation(() => {})
})

afterEach(() => {
  vol.reset()
  console.info.mockRestore()
  console.log.mockRestore()
})

test('destroys cell files', async () => {
  vol.fromJSON(await files({ name: 'User' }))
  const unlinkSpy = vi.spyOn(fs, 'unlinkSync')
  const t = tasks({
    componentName: 'cell',
    filesFn: files,
    name: 'User',
  })
  t.options.renderer = 'silent'

  await t.run()

  const generatedFiles = Object.keys(await files({ name: 'User' }))
  expect(generatedFiles.length).toEqual(unlinkSpy.mock.calls.length)
  generatedFiles.forEach((f) => expect(unlinkSpy).toHaveBeenCalledWith(f))
})

test('destroys cell files with stories and tests', async () => {
  vol.fromJSON(await files({ name: 'User', stories: true, tests: true }))
  const unlinkSpy = vi.spyOn(fs, 'unlinkSync')
  const t = tasks({
    componentName: 'cell',
    filesFn: files,
    name: 'User',
    stories: true,
    tests: true,
  })
  t.options.renderer = 'silent'

  await t.run()

  const generatedFiles = Object.keys(
    await files({ name: 'User', stories: true, tests: true }),
  )
  expect(generatedFiles.length).toEqual(unlinkSpy.mock.calls.length)
  generatedFiles.forEach((f) => expect(unlinkSpy).toHaveBeenCalledWith(f))
})
