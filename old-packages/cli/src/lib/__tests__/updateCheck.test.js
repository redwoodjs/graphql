global.__dirname = __dirname

vi.mock('fs-extra')
vi.mock('latest-version')

vi.mock('@redwoodjs/project-config', async (importOriginal) => {
  const originalProjectConfig = await importOriginal()
  return {
    ...originalProjectConfig,
    getPaths: () => {
      return {
        generated: {
          base: '.redwood',
        },
        base: '',
      }
    },
    getConfig: vi.fn(),
  }
})

import fs from 'fs-extra'
import latestVersion from 'latest-version'
import { vol } from 'memfs'
import {
  vi,
  describe,
  beforeAll,
  afterAll,
  it,
  expect,
  beforeEach,
  afterEach,
} from 'vitest'

import { getConfig } from '@redwoodjs/project-config'

import { setLock } from '../locking'
import * as updateCheck from '../updateCheck'

const TESTING_CURRENT_DATETIME = 1640995200000

describe('Update is not available (1.0.0 -> 1.0.0)', () => {
  beforeAll(() => {
    // Use fake datetime
    vi.useFakeTimers()
    vi.setSystemTime(new Date(TESTING_CURRENT_DATETIME))
    getConfig.mockReturnValue({
      notifications: {
        versionUpdates: ['latest'],
      },
    })
    // Prevent the appearance of stale locks
    fs.statSync = vi.fn(() => {
      return {
        birthtimeMs: Date.now(),
      }
    })

    // Prevent console output during tests
    console.log = vi.fn()
    console.time = vi.fn()
    console.timeEnd = vi.fn()
  })

  afterAll(() => {
    vi.useRealTimers()
  })

  beforeEach(() => {
    // Set the fake remote version
    latestVersion.mockImplementation(() => {
      return '1.0.0'
    })

    vol.fromJSON({
      // Users package.json containing the redwood version
      'package.json': JSON.stringify({
        devDependencies: {
          '@redwoodjs/core': '^1.0.0',
        },
      }),
    })
  })

  afterEach(() => {
    vol.reset()
    vi.clearAllMocks()
  })

  it('Produces the correct updateData.json file', async () => {
    await updateCheck.check()
    const data = updateCheck.readUpdateDataFile()
    data.remoteVersions = Object.fromEntries(data.remoteVersions)
    expect(data).toStrictEqual({
      localVersion: '1.0.0',
      remoteVersions: { latest: '1.0.0' },
      checkedAt: TESTING_CURRENT_DATETIME,
      shownAt: updateCheck.DEFAULT_DATETIME_MS,
    })
  })

  it('Should want to check before any check has run', () => {
    expect(updateCheck.shouldCheck()).toBe(true)
  })

  it('Should not want to check after a check has run', async () => {
    await updateCheck.check()
    expect(updateCheck.shouldCheck()).toBe(false)
  })

  it('Should not want to show before any check has run', () => {
    expect(updateCheck.shouldShow()).toBe(false)
  })

  it('Should not want to show after a check has run', async () => {
    await updateCheck.check()
    expect(updateCheck.shouldShow()).toBe(false)
  })

  it('Respects the lock', async () => {
    setLock(updateCheck.CHECK_LOCK_IDENTIFIER)
    expect(updateCheck.shouldCheck()).toBe(false)
  })
})

describe('Update is available (1.0.0 -> 2.0.0)', () => {
  beforeAll(() => {
    // Use fake datetime
    vi.useFakeTimers()
    vi.setSystemTime(new Date(TESTING_CURRENT_DATETIME))
    getConfig.mockReturnValue({
      notifications: {
        versionUpdates: ['latest'],
      },
    })
    // Prevent the appearance of stale locks
    fs.statSync = vi.fn(() => {
      return {
        birthtimeMs: Date.now(),
      }
    })
  })

  afterAll(() => {
    vi.useRealTimers()
  })

  beforeEach(() => {
    // Set the fake remote version
    latestVersion.mockImplementation(() => {
      return '2.0.0'
    })

    vol.fromJSON({
      // Users package.json containing the redwood version
      'package.json': JSON.stringify({
        devDependencies: {
          '@redwoodjs/core': '^1.0.0',
        },
      }),
    })
  })

  afterEach(() => {
    vol.reset()
    vi.clearAllMocks()
  })

  it('Produces the correct updateData.json file', async () => {
    await updateCheck.check()
    const data = updateCheck.readUpdateDataFile()
    data.remoteVersions = Object.fromEntries(data.remoteVersions)
    expect(data).toStrictEqual({
      localVersion: '1.0.0',
      remoteVersions: { latest: '2.0.0' },
      checkedAt: TESTING_CURRENT_DATETIME,
      shownAt: updateCheck.DEFAULT_DATETIME_MS,
    })
  })

  it('Should want to check before any check has run', () => {
    expect(updateCheck.shouldCheck()).toBe(true)
  })

  it('Should not want to check after a check has run', async () => {
    await updateCheck.check()
    expect(updateCheck.shouldCheck()).toBe(false)
  })

  it('Should not want to show before any check has run', () => {
    expect(updateCheck.shouldShow()).toBe(false)
  })

  it('Should want to show after a check has run', async () => {
    await updateCheck.check()
    expect(updateCheck.shouldShow()).toBe(true)
  })

  it('Respects the lock', async () => {
    setLock(updateCheck.CHECK_LOCK_IDENTIFIER)
    expect(updateCheck.shouldCheck()).toBe(false)
  })
})

describe('Update is available with rc tag (1.0.0-rc.1 -> 1.0.1-rc.58)', () => {
  beforeAll(() => {
    // Use fake datetime
    vi.useFakeTimers()
    vi.setSystemTime(new Date(TESTING_CURRENT_DATETIME))
    getConfig.mockReturnValue({
      notifications: {
        versionUpdates: ['latest', 'rc'],
      },
    })
    // Prevent the appearance of stale locks
    fs.statSync = vi.fn(() => {
      return {
        birthtimeMs: Date.now(),
      }
    })
  })

  afterAll(() => {
    vi.useRealTimers()
  })

  beforeEach(() => {
    // Set the fake remote version
    latestVersion.mockImplementation((_, { version }) => {
      return version === 'rc' ? '1.0.1-rc.58' : '1.0.0'
    })

    vol.fromJSON({
      // Users package.json containing the redwood version
      'package.json': JSON.stringify({
        devDependencies: {
          '@redwoodjs/core': '^1.0.0-rc.1',
        },
      }),
    })
  })

  afterEach(() => {
    vol.reset()
    vi.clearAllMocks()
  })

  it('Produces the correct updateData.json file', async () => {
    await updateCheck.check()
    const data = updateCheck.readUpdateDataFile()
    data.remoteVersions = Object.fromEntries(data.remoteVersions)
    expect(data).toStrictEqual({
      localVersion: '1.0.0-rc.1',
      remoteVersions: { latest: '1.0.0', rc: '1.0.1-rc.58' },
      checkedAt: TESTING_CURRENT_DATETIME,
      shownAt: updateCheck.DEFAULT_DATETIME_MS,
    })
  })

  it('Should want to check before any check has run', () => {
    expect(updateCheck.shouldCheck()).toBe(true)
  })

  it('Should not want to check after a check has run', async () => {
    await updateCheck.check()
    expect(updateCheck.shouldCheck()).toBe(false)
  })

  it('Should not want to show before any check has run', () => {
    expect(updateCheck.shouldShow()).toBe(false)
  })

  it('Should want to show after a check has run', async () => {
    await updateCheck.check()
    expect(updateCheck.shouldShow()).toBe(true)
  })

  it('Respects the lock', async () => {
    setLock(updateCheck.CHECK_LOCK_IDENTIFIER)
    expect(updateCheck.shouldCheck()).toBe(false)
  })
})
