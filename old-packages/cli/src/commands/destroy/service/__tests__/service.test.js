globalThis.__dirname = __dirname
import fs from 'fs-extra'
import { vol } from 'memfs'
import { vi, describe, beforeEach, afterEach, test, expect } from 'vitest'

import '../../../../lib/test'

import { getDefaultArgs } from '../../../../lib'
import { builder, files } from '../../../generate/service/service'
import { tasks } from '../service'

vi.mock('fs-extra')

vi.mock('../../../../lib', async (importOriginal) => {
  const originalLib = await importOriginal()
  return {
    ...originalLib,
    generateTemplate: () => '',
  }
})

vi.mock('../../../../lib/schemaHelpers', async (importOriginal) => {
  const originalSchemaHelpers = await importOriginal()
  const path = require('path')
  return {
    ...originalSchemaHelpers,
    getSchema: () =>
      require(path.join(globalThis.__dirname, 'fixtures', 'post.json')),
  }
})

describe('rw destroy service', () => {
  beforeEach(() => {
    vi.spyOn(console, 'info').mockImplementation(() => {})
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    vol.reset()
    vi.spyOn(fs, 'unlinkSync').mockClear()
    console.info.mockRestore()
    console.log.mockRestore()
  })

  describe('for javascript files', () => {
    beforeEach(async () => {
      vol.fromJSON(await files({ ...getDefaultArgs(builder), name: 'User' }))
    })
    test('destroys service files', async () => {
      const unlinkSpy = vi.spyOn(fs, 'unlinkSync')
      const t = tasks({
        componentName: 'service',
        filesFn: files,
        name: 'User',
      })
      t.options.renderer = 'silent'

      return t.run().then(async () => {
        const generatedFiles = Object.keys(
          await files({ ...getDefaultArgs(builder), name: 'User' }),
        )
        expect(generatedFiles.length).toEqual(unlinkSpy.mock.calls.length)
        generatedFiles.forEach((f) => expect(unlinkSpy).toHaveBeenCalledWith(f))
      })
    })
  })

  describe('for typescript files', () => {
    beforeEach(async () => {
      vol.fromJSON(
        await files({
          ...getDefaultArgs(builder),
          typescript: true,
          name: 'User',
        }),
      )
    })

    test('destroys service files', async () => {
      const unlinkSpy = vi.spyOn(fs, 'unlinkSync')
      const t = tasks({
        componentName: 'service',
        filesFn: files,
        name: 'User',
      })
      t.options.renderer = 'silent'

      return t.run().then(async () => {
        const generatedFiles = Object.keys(
          await files({
            ...getDefaultArgs(builder),
            typescript: true,
            name: 'User',
          }),
        )
        expect(generatedFiles.length).toEqual(unlinkSpy.mock.calls.length)
        generatedFiles.forEach((f) => expect(unlinkSpy).toHaveBeenCalledWith(f))
      })
    })
  })
})
