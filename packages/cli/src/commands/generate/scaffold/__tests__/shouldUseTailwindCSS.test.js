globalThis.__dirname = __dirname

import fs from 'fs-extra'
import { vi, describe, expect, test } from 'vitest'

import '../../../../lib/test'
import { shouldUseTailwindCSS } from '../scaffold'

vi.mock('fs-extra')

describe('with --tailwind flag not set', () => {
  test('having a tailwind config file present', () => {
    fs.existsSync.mockReturnValue(true)

    expect(shouldUseTailwindCSS(undefined)).toEqual(true)
  })

  test('not having a tailwind config file present', () => {
    fs.existsSync.mockReturnValue(false)

    expect(shouldUseTailwindCSS(undefined)).toEqual(false)
  })
})

describe('with --tailwind flag set', () => {
  test('having a tailwind config file', () => {
    fs.existsSync.mockReturnValue(true)

    expect(shouldUseTailwindCSS(true)).toEqual(true)
    expect(shouldUseTailwindCSS(false)).toEqual(false)
  })

  test('not having a tailwind config file present', () => {
    fs.existsSync.mockReturnValue(false)

    expect(shouldUseTailwindCSS(true)).toEqual(true)
    expect(shouldUseTailwindCSS(false)).toEqual(false)
  })
})
