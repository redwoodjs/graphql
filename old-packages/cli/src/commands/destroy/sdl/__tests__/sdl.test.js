globalThis.__dirname = __dirname

import fs from 'fs-extra'
import { vol } from 'memfs'
import { vi, beforeEach, afterEach, test, expect, describe } from 'vitest'

import '../../../../lib/test'

import { getDefaultArgs } from '../../../../lib'
import { builder, files } from '../../../generate/sdl/sdl'
import { tasks } from '../sdl'

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

describe('rw destroy sdl', () => {
  afterEach(() => {
    vol.reset()
    vi.spyOn(fs, 'unlinkSync').mockClear()
  })

  describe('for javascript files', () => {
    beforeEach(async () => {
      vol.fromJSON(await files({ ...getDefaultArgs(builder), name: 'Post' }))
    })

    test('destroys sdl files', async () => {
      const unlinkSpy = vi.spyOn(fs, 'unlinkSync')
      const t = tasks({ model: 'Post' })
      t.options.renderer = 'silent'

      return t.tasks[0].run().then(async () => {
        const generatedFiles = Object.keys(
          await files({ ...getDefaultArgs(builder), name: 'Post' }),
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
          name: 'Post',
        }),
      )
    })

    test('destroys sdl files', async () => {
      const unlinkSpy = vi.spyOn(fs, 'unlinkSync')
      const t = tasks({ model: 'Post' })
      t.options.renderer = 'silent'

      return t.tasks[0].run().then(async () => {
        const generatedFiles = Object.keys(
          await files({
            ...getDefaultArgs(builder),
            typescript: true,
            name: 'Post',
          }),
        )
        expect(generatedFiles.length).toEqual(unlinkSpy.mock.calls.length)
        generatedFiles.forEach((f) => expect(unlinkSpy).toHaveBeenCalledWith(f))
      })
    })
  })
})
