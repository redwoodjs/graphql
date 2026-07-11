import fs from 'fs'
import path from 'path'

import { describe, it, expect } from 'vitest'

const distPath = path.join(__dirname, 'dist')
const packageConfig = JSON.parse(fs.readFileSync('./package.json', 'utf-8'))

describe('dist', () => {
  it("shouldn't have the __tests__ directory", () => {
    expect(fs.existsSync(path.join(distPath, '__tests__'))).toEqual(false)
  })

  it('ships three bins', () => {
    expect(packageConfig.bin).toMatchInlineSnapshot(`
      {
        "rw-api-server-watch": "./dist/watch.js",
        "rw-log-formatter": "./dist/logFormatter/bin.js",
        "rw-server": "./dist/bin.js",
      }
    `)
  })
})
