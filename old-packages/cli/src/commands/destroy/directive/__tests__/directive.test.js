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

import { files } from '../../../generate/directive/directive'
import { tasks } from '../directive'

beforeEach(() => {
  vol.fromJSON(files({ name: 'require-admin', type: 'validator', tests: true }))
  vi.spyOn(console, 'info').mockImplementation(() => {})
  vi.spyOn(console, 'log').mockImplementation(() => {})
})

afterEach(() => {
  vol.reset()
  vi.spyOn(fs, 'unlinkSync').mockClear()
  console.info.mockRestore()
  console.log.mockRestore()
})

test('destroys directive files', async () => {
  const unlinkSpy = vi.spyOn(fs, 'unlinkSync')
  const t = tasks({
    componentName: 'directive',
    filesFn: (args) => files({ ...args, type: 'validator' }),
    name: 'require-admin',
  })
  t.options.renderer = 'silent'

  return t.run().then(() => {
    const generatedFiles = Object.keys(
      files({ name: 'require-admin', type: 'validator', tests: true }),
    )
    expect(generatedFiles.length).toEqual(unlinkSpy.mock.calls.length)
    generatedFiles.forEach((f) => expect(unlinkSpy).toHaveBeenCalledWith(f))
  })
})
