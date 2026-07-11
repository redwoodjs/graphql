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

import { files } from '../../../generate/function/function'
import { tasks } from '../function'

beforeEach(async () => {
  vol.fromJSON(files({ name: 'sendMail' }))
  vi.spyOn(console, 'info').mockImplementation(() => {})
  vi.spyOn(console, 'log').mockImplementation(() => {})
})

afterEach(() => {
  vol.reset()
  vi.spyOn(fs, 'unlinkSync').mockClear()
  console.info.mockRestore()
  console.log.mockRestore()
})

test('destroys service files', async () => {
  const unlinkSpy = vi.spyOn(fs, 'unlinkSync')
  const t = tasks({
    componentName: 'service',
    filesFn: files,
    name: 'sendMail',
  })
  t.options.renderer = 'silent'

  return t.run().then(async () => {
    const generatedFiles = Object.keys(files({ name: 'sendMail' }))
    expect(generatedFiles.length).toEqual(unlinkSpy.mock.calls.length)
    generatedFiles.forEach((f) => expect(unlinkSpy).toHaveBeenCalledWith(f))
  })
})
