import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

const distPath = path.join(__dirname, 'dist')

describe('dist', () => {
  it("shouldn't have tests", () => {
    expect(fs.existsSync(path.join(distPath, '__tests__'))).toBe(false)
  })

  it("shouldn't have the types file", () => {
    expect(fs.existsSync(path.join(distPath, 'types.ts'))).toBe(false)
    expect(fs.existsSync(path.join(distPath, 'types.js'))).toBe(false)
  })

  it('should export commands', async () => {
    const mod = await import(path.join(distPath, 'index.js'))
    expect(mod).toHaveProperty('commands')
  })

  describe('bin', () => {
    it('starts with shebang', () => {
      const binFileContent = fs.readFileSync(
        path.join(distPath, 'bin.js'),
        'utf-8',
      )
      binFileContent.startsWith('#!/usr/bin/env node')
    })
  })
})
