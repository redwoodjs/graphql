import { describe, expect, vi, it, beforeEach } from 'vitest'

import type { Job, JobDefinition } from '../../types.js'
import type { CreateWorkerArgs } from '../JobManager.js'
import { JobManager } from '../JobManager.js'
import { Scheduler } from '../Scheduler.js'
import { Worker } from '../Worker.js'

import { MockAdapter, mockLogger } from './mocks.js'

vi.mock('../Scheduler')

describe('constructor', () => {
  const mockAdapter = new MockAdapter()
  const adapters = { mock: mockAdapter }
  const queues = ['queue'] as const
  const logger = mockLogger
  const workers = [
    {
      adapter: 'mock' as const,
      queue: '*' as const,
      count: 1,
    },
  ]

  let manager: JobManager<typeof adapters, typeof queues, typeof logger>

  beforeEach(() => {
    manager = new JobManager({
      adapters,
      queues,
      logger,
      workers,
    })
  })

  it('saves adapters', () => {
    expect(manager.adapters).toEqual({ mock: mockAdapter })
  })

  it('saves queues', () => {
    expect(manager.queues).toEqual(queues)
  })

  it('saves logger', () => {
    expect(manager.logger).toEqual(logger)
  })

  it('saves workers', () => {
    expect(manager.workers).toEqual(workers)
  })
})

describe('createScheduler()', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  const mockAdapter = new MockAdapter()

  it('returns a function', () => {
    const manager = new JobManager({
      adapters: {
        mock: mockAdapter,
      },
      queues: ['default'] as const,
      logger: mockLogger,
      workers: [],
    })

    const scheduler = manager.createScheduler({ adapter: 'mock' })

    expect(scheduler).toBeInstanceOf(Function)
  })

  it('initializes the scheduler with the correct adapter', () => {
    const manager = new JobManager({
      adapters: {
        mock: mockAdapter,
      },
      queues: ['*'] as const,
      logger: mockLogger,
      workers: [],
    })
    manager.createScheduler({ adapter: 'mock', logger: mockLogger })

    expect(Scheduler).toHaveBeenCalledWith(
      expect.objectContaining({ adapter: mockAdapter }),
    )
  })

  it('initializes the scheduler with a logger', () => {
    const manager = new JobManager({
      adapters: {
        mock: mockAdapter,
      },
      queues: ['default'] as const,
      logger: mockLogger,
      workers: [],
    })
    manager.createScheduler({ adapter: 'mock', logger: mockLogger })

    expect(Scheduler).toHaveBeenCalledWith(
      expect.objectContaining({ logger: mockLogger }),
    )
  })

  it('calling the function invokes the schedule() method of the scheduler', () => {
    const manager = new JobManager({
      adapters: {
        mock: mockAdapter,
      },
      queues: ['default'] as const,
      logger: mockLogger,
      workers: [],
    })
    const mockJob: Job<['default'], unknown[]> = {
      queue: 'default',
      name: 'mockJob',
      path: 'mockJob/mockJob',

      perform: vi.fn(),
    }
    const mockArgs = ['foo']
    const mockOptions = { wait: 300 }
    const scheduler = manager.createScheduler({ adapter: 'mock' })

    scheduler(mockJob, mockArgs, mockOptions)

    expect(Scheduler.prototype.schedule).toHaveBeenCalledWith({
      job: mockJob,
      args: mockArgs,
      options: mockOptions,
    })
  })

  it('returns a function that takes an array of arguments to pass to perform()', () => {
    const manager = new JobManager({
      adapters: {
        mock: mockAdapter,
      },
      queues: ['default'] as const,
      logger: mockLogger,
      workers: [],
    })

    interface MockJobArgs {
      foo: string
      bar: number
    }

    const mockJob = manager.createJob({
      queue: 'default',
      perform: ({ foo, bar }: MockJobArgs) => {
        return void (foo + bar)
      },
    })

    const scheduler = manager.createScheduler({ adapter: 'mock' })

    // Should be correct. No red squiggly lines
    scheduler(mockJob, [{ foo: 'foo', bar: 645 }], { wait: 30 })

    // Uncomment the line below and you should see an error because passing
    // `undefined` should not be allowed when arguments are required
    // scheduler(mockJob, undefined, { wait: 30 })

    // Uncomment the line below and you should see an error because not passing
    // anything should not be allowed when arguments are required
    // scheduler(mockJob)
  })

  it("returns a function that doesn't need arguments to pass to perform()", () => {
    const manager = new JobManager({
      adapters: {
        mock: mockAdapter,
      },
      queues: ['default'] as const,
      logger: mockLogger,
      workers: [],
    })

    const mockJob = manager.createJob({
      queue: 'default',
      perform: () => {
        return void 'no args'
      },
    })

    const scheduler = manager.createScheduler({ adapter: 'mock' })

    // Should be correct, explicitly passing an empty array as job function arguments
    scheduler(mockJob, [], { wait: 30 })
    scheduler(mockJob, [])
    // Should be correct, explicitly passing `undefined` as job options argument
    scheduler(mockJob, undefined)
    // Should be correct, not passing any arguments (allowed because the job doesn't require any)
    scheduler(mockJob)
  })

  it('returns a function with only optional arguments to pass to perform()', () => {
    const manager = new JobManager({
      adapters: {
        mock: mockAdapter,
      },
      queues: ['default'] as const,
      logger: mockLogger,
      workers: [],
    })

    const mockJob = manager.createJob({
      queue: 'default',
      perform: (first?: string, second?: string) => {
        return void (first || '' + second)
      },
    })

    const scheduler = manager.createScheduler({ adapter: 'mock' })

    // Should be correct
    scheduler(mockJob, ['1st', '2nd'])
    // Should be correct
    scheduler(mockJob, [])

    // Uncomment any of the lines below and you'll see an error. Ideally I think
    // this should be allowed, because all arguments are optional. But on this
    // first iteration I couldn't figure out how to make that work.
    // scheduler(mockJob)
  })
})

describe('createJob()', () => {
  it('returns the same job description that was passed in', () => {
    const manager = new JobManager({
      adapters: {},
      queues: ['default'] as const,
      logger: mockLogger,
      workers: [],
    })
    const jobDefinition: JobDefinition<['default'], unknown[]> = {
      queue: 'default',
      perform: vi.fn(),
    }

    const job = manager.createJob(jobDefinition)

    expect(job).toEqual(jobDefinition)
  })
})

describe('createWorker()', () => {
  it('creates a worker with a custom configuration', () => {
    const mockAdapter = new MockAdapter()
    const customLogger = { ...mockLogger, custom: true }
    const manager = new JobManager({
      adapters: { mock: mockAdapter },
      queues: ['default', 'high'] as const,
      logger: mockLogger,
      workers: [
        {
          adapter: 'mock' as const,
          queue: ['default', 'high'] as const,
          count: 1,
          logger: customLogger,
          maxAttempts: 10,
          maxRuntime: 120000,
          sleepDelay: 7,
          deleteFailedJobs: true,
          deleteSuccessfulJobs: false,
        },
      ],
    })

    const workerArgs: CreateWorkerArgs = {
      index: 0,
      workoff: true,
      clear: true,
      processName: 'test-worker-custom-config',
    }

    const worker = manager.createWorker(workerArgs)

    expect(worker).toBeInstanceOf(Worker)
    expect(worker).toHaveProperty('adapter', mockAdapter)
    expect(worker).toHaveProperty('logger', customLogger)
    expect(worker).toHaveProperty('maxAttempts', 10)
    expect(worker).toHaveProperty('maxRuntime', 120000)
    expect(worker).toHaveProperty('sleepDelay', 7000)
    expect(worker).toHaveProperty('deleteFailedJobs', true)
    expect(worker).toHaveProperty('deleteSuccessfulJobs', false)
    expect(worker).toHaveProperty('processName', 'test-worker-custom-config')
    expect(worker).toHaveProperty('queues', ['default', 'high'])
    expect(worker).toHaveProperty('workoff', true)
    expect(worker).toHaveProperty('clear', true)
  })
})
