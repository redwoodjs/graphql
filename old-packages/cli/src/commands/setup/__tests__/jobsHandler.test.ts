vi.mock('fs-extra')

import '../../../lib/mockTelemetry'

import { vol, fs as memfsFs } from 'memfs'
import {
  vi,
  describe,
  it,
  expect,
  beforeEach,
  beforeAll,
  afterAll,
} from 'vitest'

import type * as ProjectConfig from '@redwoodjs/project-config'

import { Listr2Mock } from '../../../__tests__/Listr2Mock'
// @ts-expect-error - This is a JS file
import * as jobsHandler from '../jobs/jobsHandler.js'

vi.mock('fs', async () => ({ ...memfsFs, default: { ...memfsFs } }))
vi.mock('node:fs', async () => ({ ...memfsFs, default: { ...memfsFs } }))

vi.mock('@prisma/internals', async () => ({
  getDMMF: async () => ({
    datamodel: {
      models: [{ name: 'BackgroundJob' }],
    },
  }),
}))

vi.mock('@redwoodjs/cli-helpers', () => ({
  addApiPackages: () => ({
    title: 'Adding required api packages...',
    task: async () => {},
  }),
}))

vi.mock('@redwoodjs/project-config', async (importOriginal) => {
  const path = require('path')
  const originalProjectConfig = await importOriginal<typeof ProjectConfig>()
  return {
    ...originalProjectConfig,
    getPaths: () => {
      const BASE_PATH = '/path/to/project'
      return {
        base: BASE_PATH,
        api: {
          base: path.join(BASE_PATH, 'api'),
          dbSchema: path.join(BASE_PATH, 'api', 'db', 'schema.prisma'),
          lib: path.join(BASE_PATH, 'api', 'src', 'lib'),
          jobs: path.join(BASE_PATH, 'api', 'src', 'jobs'),
        },
        web: {
          base: path.join(BASE_PATH, 'web'),
        },
      }
    },
  }
})

vi.mock('listr2', () => ({
  Listr: Listr2Mock,
}))

beforeAll(() => {
  vi.spyOn(console, 'log')
  vi.spyOn(console, 'error')
})

afterAll(() => {
  vi.mocked(console).log.mockRestore?.()
  vi.mocked(console).error.mockRestore?.()
})

beforeEach(() => {
  vol.reset()
  vol.fromJSON(
    {
      'package.json': '{}',
      'api/tsconfig.json': '',
      'api/db/schema.prisma': '',
      'api/src/lib': null,
      // api/src/jobs already exists – this should not cause an error
      'api/src/jobs': null,
      [__dirname + '/../jobs/templates/jobs.ts.template']: '',
    },
    '/path/to/project',
  )
})

describe('jobsHandler', () => {
  it('skips creating the BackgroundJobs model if it already exists', async () => {
    await jobsHandler.handler({ force: false })

    expect(Listr2Mock.skippedTaskTitles).toEqual([
      'BackgroundJob model exists, skipping',
    ])
    expect(console.error).not.toHaveBeenCalled()
  })

  it('ignores error for already existing api/src/jobs dir', async () => {
    await jobsHandler.handler({ force: false })

    expect(Listr2Mock.executedTaskTitles).toContain(
      'Creating jobs dir at api/src/jobs...',
    )
    expect(console.error).not.toHaveBeenCalled()
  })
})
