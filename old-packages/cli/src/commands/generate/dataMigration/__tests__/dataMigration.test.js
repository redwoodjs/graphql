globalThis.__dirname = __dirname
import path from 'path'
import '../../../../lib/test'

import { afterEach, test, expect } from 'vitest'

import * as generator from '../dataMigration'

const RealDate = Date

afterEach(() => {
  globalThis.Date = RealDate
})

const mockDate = (isoDate) => {
  globalThis.Date = class extends RealDate {
    constructor() {
      return new RealDate(isoDate)
    }
  }
}

test('returns exactly 1 file', async () => {
  const files = await generator.files({ name: 'MoveUser' })

  expect(Object.keys(files).length).toEqual(1)
})

test('generates a file with a timestame in its name', async () => {
  mockDate('2020-07-16T22:31:11.076Z')

  const files = await generator.files({ name: 'MoveUser' })
  const filename = path.basename(Object.keys(files)[0])

  expect(filename.split('-')[0]).toEqual('20200716223111')
})

test('generates a file with a paramcase version of the passed name', async () => {
  for (const name of ['MoveUser', 'moveUser', 'move-user', 'move_user']) {
    const files = await generator.files({ name })
    const filename = path.parse(path.basename(Object.keys(files)[0])).name
    const parts = filename.split('-')
    parts.shift()

    expect(parts.join('-')).toEqual('move-user')
  }
})

test('creates a JS file with expected contents', async () => {
  const files = await generator.files({ name: 'MoveUser' })
  const filename = Object.keys(files)[0]
  expect(files[filename]).toMatchSnapshot()
})

test('can generate a TS file with expected contents', async () => {
  const files = await generator.files({ name: 'MoveUser', typescript: true })
  const filename = Object.keys(files)[0]
  expect(files[filename]).toMatchSnapshot()
})
