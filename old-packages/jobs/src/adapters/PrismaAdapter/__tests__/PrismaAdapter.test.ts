import type { PrismaClient } from '@prisma/client'
import { describe, expect, vi, it, beforeEach, afterEach } from 'vitest'

import { DEFAULT_MODEL_NAME } from '../../../consts.js'
import { mockLogger } from '../../../core/__tests__/mocks.js'
import * as errors from '../errors.js'
import { PrismaAdapter } from '../PrismaAdapter.js'

vi.useFakeTimers().setSystemTime(new Date('2024-01-01'))

let mockDb: PrismaClient

beforeEach(() => {
  mockDb = {
    _activeProvider: 'sqlite',
    _runtimeDataModel: {
      models: {
        BackgroundJob: {
          dbName: null,
        },
      },
    },
    backgroundJob: {
      create: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  }
})

afterEach(() => {
  vi.resetAllMocks()
})

describe('constructor', () => {
  it('defaults this.model name', () => {
    const adapter = new PrismaAdapter({ db: mockDb, logger: mockLogger })

    expect(adapter.model).toEqual(DEFAULT_MODEL_NAME)
  })

  it('can manually set this.model', () => {
    mockDb._runtimeDataModel.models = {
      Job: {
        dbName: null,
      },
    }
    mockDb.job = {}

    const adapter = new PrismaAdapter({
      db: mockDb,
      model: 'Job',
      logger: mockLogger,
    })

    expect(adapter.model).toEqual('Job')
  })

  it('throws an error with a model name that does not exist', () => {
    expect(
      () =>
        new PrismaAdapter({ db: mockDb, model: 'FooBar', logger: mockLogger }),
    ).toThrow(errors.ModelNameError)
  })

  it('sets this.accessor to the correct Prisma accessor', () => {
    const adapter = new PrismaAdapter({ db: mockDb, logger: mockLogger })

    expect(adapter.accessor).toEqual(mockDb.backgroundJob)
  })

  it('sets this.provider based on the active provider', () => {
    const adapter = new PrismaAdapter({ db: mockDb, logger: mockLogger })

    expect(adapter.provider).toEqual('sqlite')
  })
})

describe('schedule()', () => {
  it('creates a job in the DB with required data', async () => {
    const createSpy = vi
      .spyOn(mockDb.backgroundJob, 'create')
      .mockReturnValue({ id: 1 })
    const adapter = new PrismaAdapter({ db: mockDb, logger: mockLogger })
    await adapter.schedule({
      name: 'RedwoodJob',
      path: 'RedwoodJob/RedwoodJob',
      args: ['foo', 'bar'],
      queue: 'default',
      priority: 50,
      runAt: new Date(),
    })

    expect(createSpy).toHaveBeenCalledWith({
      data: {
        handler: JSON.stringify({
          name: 'RedwoodJob',
          path: 'RedwoodJob/RedwoodJob',
          args: ['foo', 'bar'],
        }),
        priority: 50,
        queue: 'default',
        runAt: new Date(),
      },
    })
  })
})

describe('find()', () => {
  it('returns undefined if no job found', async () => {
    vi.spyOn(mockDb.backgroundJob, 'findFirst').mockReturnValue(null)
    const adapter = new PrismaAdapter({ db: mockDb, logger: mockLogger })
    const job = await adapter.find({
      processName: 'test',
      maxRuntime: 1000,
      queues: ['foobar'],
    })

    expect(job).toBeUndefined()
  })

  it('returns a job if found', async () => {
    const mockJob = {
      id: 1,
      handler: JSON.stringify({
        name: 'TestJob',
        path: 'TestJob/TestJob',
        args: [],
      }),
    }
    vi.spyOn(mockDb.backgroundJob, 'findFirst').mockReturnValue(mockJob)
    vi.spyOn(mockDb.backgroundJob, 'updateMany').mockReturnValue({ count: 1 })
    const adapter = new PrismaAdapter({ db: mockDb, logger: mockLogger })
    const job = await adapter.find({
      processName: 'test',
      maxRuntime: 1000,
      queues: ['default'],
    })

    expect(job).toEqual({
      ...mockJob,
      name: 'TestJob',
      path: 'TestJob/TestJob',
      args: [],
    })
  })

  it('increments the `attempts` count on the found job', async () => {
    const mockJob = {
      id: 1,
      handler: JSON.stringify({
        name: 'TestJob',
        path: 'TestJob/TestJob',
        args: [],
      }),
      attempts: 0,
    }
    vi.spyOn(mockDb.backgroundJob, 'findFirst').mockReturnValue(mockJob)
    const updateSpy = vi
      .spyOn(mockDb.backgroundJob, 'updateMany')
      .mockReturnValue({ count: 1 })
    const adapter = new PrismaAdapter({ db: mockDb, logger: mockLogger })
    await adapter.find({
      processName: 'test',
      maxRuntime: 1000,
      queues: ['default'],
    })

    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ attempts: 1 }),
      }),
    )
  })

  it('locks the job for the current process', async () => {
    const mockJob = {
      id: 1,
      attempts: 0,
      handler: JSON.stringify({
        name: 'TestJob',
        path: 'TestJob/TestJob',
        args: [],
      }),
    }
    vi.spyOn(mockDb.backgroundJob, 'findFirst').mockReturnValue(mockJob)
    const updateSpy = vi
      .spyOn(mockDb.backgroundJob, 'updateMany')
      .mockReturnValue({ count: 1 })
    const adapter = new PrismaAdapter({ db: mockDb, logger: mockLogger })
    await adapter.find({
      processName: 'test-process',
      maxRuntime: 1000,
      queues: ['default'],
    })

    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ lockedBy: 'test-process' }),
      }),
    )
  })

  it('locks the job with a current timestamp', async () => {
    const mockJob = {
      id: 1,
      attempts: 0,
      handler: JSON.stringify({
        name: 'TestJob',
        path: 'TestJob/TestJob',
        args: [],
      }),
    }
    vi.spyOn(mockDb.backgroundJob, 'findFirst').mockReturnValue(mockJob)
    const updateSpy = vi
      .spyOn(mockDb.backgroundJob, 'updateMany')
      .mockReturnValue({ count: 1 })
    const adapter = new PrismaAdapter({ db: mockDb, logger: mockLogger })
    await adapter.find({
      processName: 'test-process',
      maxRuntime: 1000,
      queues: ['default'],
    })

    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ lockedAt: new Date() }),
      }),
    )
  })
})

const mockPrismaJob = {
  id: 1,
  handler: '',
  attempts: 10,
  runAt: new Date(),
  lockedAt: new Date(),
  lockedBy: 'test-process',
  lastError: null,
  failedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  name: 'TestJob',
  path: 'TestJob/TestJob',
  args: [],
}

describe('success()', () => {
  it('deletes the job from the DB if option set', async () => {
    const spy = vi.spyOn(mockDb.backgroundJob, 'delete')
    const adapter = new PrismaAdapter({
      db: mockDb,
      logger: mockLogger,
    })
    await adapter.success({ job: mockPrismaJob, deleteJob: true })

    expect(spy).toHaveBeenCalledWith({ where: { id: 1 } })
  })

  it('updates the job if option not set', async () => {
    const spy = vi.spyOn(mockDb.backgroundJob, 'update')
    const adapter = new PrismaAdapter({
      db: mockDb,
      logger: mockLogger,
    })
    await adapter.success({ job: mockPrismaJob, deleteJob: false })

    expect(spy).toHaveBeenCalledWith({
      where: { id: mockPrismaJob.id },
      data: {
        lockedAt: null,
        lockedBy: null,
        lastError: null,
        runAt: null,
      },
    })
  })
})

describe('error()', () => {
  it('updates the job by id', async () => {
    const spy = vi.spyOn(mockDb.backgroundJob, 'update')
    const adapter = new PrismaAdapter({ db: mockDb, logger: mockLogger })
    await adapter.error({ job: mockPrismaJob, error: new Error('test error') })

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 1 } }),
    )
  })

  it('clears the lock fields', async () => {
    const spy = vi.spyOn(mockDb.backgroundJob, 'update')
    const adapter = new PrismaAdapter({ db: mockDb, logger: mockLogger })
    await adapter.error({ job: mockPrismaJob, error: new Error('test error') })

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ lockedAt: null, lockedBy: null }),
      }),
    )
  })

  it('reschedules the job at a designated backoff time', async () => {
    const spy = vi.spyOn(mockDb.backgroundJob, 'update')
    const adapter = new PrismaAdapter({ db: mockDb, logger: mockLogger })
    await adapter.error({ job: mockPrismaJob, error: new Error('test error') })

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          runAt: new Date(new Date().getTime() + 1000 * 10 ** 4),
        }),
      }),
    )
  })

  it('records the error', async () => {
    const spy = vi.spyOn(mockDb.backgroundJob, 'update')
    const adapter = new PrismaAdapter({ db: mockDb, logger: mockLogger })
    await adapter.error({ job: mockPrismaJob, error: new Error('test error') })

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          lastError: expect.stringContaining('test error'),
        }),
      }),
    )
  })
})

describe('failure()', () => {
  it('marks the job as failed if max attempts reached', async () => {
    const spy = vi.spyOn(mockDb.backgroundJob, 'update')
    const adapter = new PrismaAdapter({ db: mockDb, logger: mockLogger })
    await adapter.failure({ job: mockPrismaJob, deleteJob: false })

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          failedAt: new Date(),
        }),
      }),
    )
  })

  it('deletes the job if option is set', async () => {
    const spy = vi.spyOn(mockDb.backgroundJob, 'delete')
    const adapter = new PrismaAdapter({ db: mockDb, logger: mockLogger })
    await adapter.failure({ job: mockPrismaJob, deleteJob: true })

    expect(spy).toHaveBeenCalledWith({ where: { id: 1 } })
  })
})

describe('clear()', () => {
  it('deletes all jobs from the DB', async () => {
    const spy = vi.spyOn(mockDb.backgroundJob, 'deleteMany')

    const adapter = new PrismaAdapter({ db: mockDb, logger: mockLogger })
    await adapter.clear()

    expect(spy).toHaveBeenCalledOnce()
  })
})

describe('backoffMilliseconds()', () => {
  it('returns the number of milliseconds to wait for the next run', () => {
    expect(
      new PrismaAdapter({ db: mockDb, logger: mockLogger }).backoffMilliseconds(
        0,
      ),
    ).toEqual(0)
    expect(
      new PrismaAdapter({ db: mockDb, logger: mockLogger }).backoffMilliseconds(
        1,
      ),
    ).toEqual(1000)
    expect(
      new PrismaAdapter({ db: mockDb, logger: mockLogger }).backoffMilliseconds(
        2,
      ),
    ).toEqual(16000)
    expect(
      new PrismaAdapter({ db: mockDb, logger: mockLogger }).backoffMilliseconds(
        3,
      ),
    ).toEqual(81000)
    expect(
      new PrismaAdapter({ db: mockDb, logger: mockLogger }).backoffMilliseconds(
        20,
      ),
    ).toEqual(160000000)
  })
})
