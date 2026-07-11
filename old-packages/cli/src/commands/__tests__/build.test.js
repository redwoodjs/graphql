vi.mock('@redwoodjs/project-config', async (importOriginal) => {
  const originalProjectConfig = await importOriginal()
  return {
    ...originalProjectConfig,
    getPaths: () => {
      return {
        api: {
          dist: '/mocked/project/api/dist',
          dbSchema: '/mocked/project/api/db/schema.prisma',
        },
        web: {
          dist: '/mocked/project/web/dist',
          routes: '/mocked/project/web/Routes.tsx',
        },
      }
    },
    getConfig: () => {
      return {
        // The build command needs nothing in this config as all
        // the values it currently reads are optional.
      }
    },
  }
})

vi.mock('fs-extra', async () => {
  const actualFs = await vi.importActual('fs-extra')
  return {
    default: {
      ...actualFs,
      // Mock the existence of the Prisma schema file
      existsSync: (path) => {
        if (path === '/mocked/project/api/db/schema.prisma') {
          return true
        }
        return actualFs.existsSync(path)
      },
    },
  }
})

import { Listr } from 'listr2'
import { vi, afterEach, test, expect } from 'vitest'

vi.mock('listr2')

// Make sure prerender doesn't get triggered
vi.mock('execa', () => ({
  default: vi.fn((cmd, params) => ({
    cmd,
    params,
  })),
}))

import { handler } from '../build'

afterEach(() => {
  vi.clearAllMocks()
})

test('the build tasks are in the correct sequence', async () => {
  await handler({})
  expect(Listr.mock.calls[0][0].map((x) => x.title)).toMatchInlineSnapshot(`
    [
      "Generating Prisma Client...",
      "Verifying graphql schema...",
      "Building API...",
      "Building Web...",
    ]
  `)
})

vi.mock('@redwoodjs/prerender/detection', () => {
  return { detectPrerenderRoutes: () => [] }
})

test('Should run prerender for web', async () => {
  const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

  await handler({ side: ['web'], prerender: true })
  expect(Listr.mock.calls[0][0].map((x) => x.title)).toMatchInlineSnapshot(`
    [
      "Building Web...",
    ]
  `)

  // Run prerendering task, but expect warning,
  // because `detectPrerenderRoutes` is empty.
  expect(consoleSpy.mock.calls[0][0]).toBe('Starting prerendering...')
  expect(consoleSpy.mock.calls[1][0]).toMatch(
    /You have not marked any routes to "prerender"/,
  )
})
