import { fs as memfs, vol } from 'memfs'
import { vi, describe, expect, it } from 'vitest'
import yargs from 'yargs'

import { getPaths } from '@redwoodjs/project-config'

import * as upCommand from '../commands/up'
import { handler as dataMigrateUpHandler } from '../commands/upHandler.js'

vi.mock('fs', () => ({ default: memfs }))
vi.mock('../commands/upHandler.js', () => ({
  handler: vi.fn(),
}))

describe('up', () => {
  it('exports `command`, `description`, `builder`, and `handler`', () => {
    expect(upCommand).toHaveProperty('command', 'up')
    expect(upCommand).toHaveProperty(
      'description',
      'Run any outstanding Data Migrations against the database',
    )
    expect(upCommand).toHaveProperty('builder')
    expect(upCommand).toHaveProperty('handler')
  })

  it('`builder` configures two options with defaults', () => {
    vol.fromNestedJSON(
      {
        'redwood.toml': '',
        api: {
          dist: {},
        },
      },
      '/redwood-app',
    )

    process.env.RWJS_CWD = '/redwood-app'

    const { argv } = upCommand.builder(yargs())

    expect(argv).toHaveProperty('import-db-client-from-dist', false)
    expect(argv).toHaveProperty('dist-path', getPaths().api.dist)
  })

  it('`handler` proxies to `./upHandler.js`', async () => {
    await upCommand.handler({
      importDbClientFromDist: false,
      distPath: '',
    })
    expect(dataMigrateUpHandler).toHaveBeenCalled()
  })
})
