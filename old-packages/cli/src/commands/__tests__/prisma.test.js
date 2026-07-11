vi.mock('@redwoodjs/project-config', async (importOriginal) => {
  const originalProjectConfig = await importOriginal()
  return {
    ...originalProjectConfig,
    getPaths: () => {
      return {
        api: {
          dbSchema:
            '/Users/bazinga/My Projects/rwprj/rwprj/api/db/schema.prisma',
        },
        base: '/Users/bazinga/My Projects/rwprj/rwprj',
      }
    },
  }
})

vi.mock('execa', () => ({
  default: {
    sync: vi.fn((cmd, params, options) => {
      return {
        cmd,
        params,
        options,
      }
    }),
  },
}))

vi.mock('fs-extra', async (importOriginal) => {
  const originalFsExtra = await importOriginal()
  return {
    default: {
      ...originalFsExtra,
      existsSync: () => true,
    },
  }
})

import execa from 'execa'
import { vi, beforeEach, afterEach, test, expect } from 'vitest'

import { handler } from '../prisma'

beforeEach(() => {
  vi.spyOn(console, 'info').mockImplementation(() => {})
  vi.spyOn(console, 'log').mockImplementation(() => {})
})

afterEach(() => {
  console.info.mockRestore()
  console.log.mockRestore()
})

test('the prisma command handles spaces', async () => {
  await handler({
    _: ['prisma'],
    $0: 'rw',
    commands: ['migrate', 'dev'],
    // options
    n: 'add bazingas',
  })

  expect(execa.sync.mock.calls[0][1]).toEqual([
    'migrate',
    'dev',
    '-n',
    '"add bazingas"',
    '--schema',
    '"/Users/bazinga/My Projects/rwprj/rwprj/api/db/schema.prisma"',
  ])
})
