import { beforeEach, describe, expect, vi, it } from 'vitest'

import { DEFAULT_LOGGER } from '../../consts.js'
import * as errors from '../../errors.js'
import { Executor } from '../Executor.js'
import { Worker } from '../Worker.js'

import { mockLogger, MockAdapter } from './mocks.js'

// don't execute any code inside Executor, just spy on whether functions are
// called
vi.mock('../Executor')

describe('constructor', () => {
  it('saves options', () => {
    const options = {
      adapter: new MockAdapter(),
      logger: mockLogger,
      queues: ['*'],
      processName: 'mockProcessName',
    }
    const worker = new Worker(options)

    expect(worker.options.adapter).toEqual(options.adapter)
  })

  it('extracts adapter from options to variable', () => {
    const options = {
      adapter: new MockAdapter(),
      logger: mockLogger,
      queues: ['*'],
      processName: 'mockProcessName',
    }
    const worker = new Worker(options)

    expect(worker.adapter).toEqual(options.adapter)
  })

  it('extracts logger from options to variable', () => {
    const options = {
      adapter: new MockAdapter(),
      logger: mockLogger,
      queues: ['*'],
      processName: 'mockProcessName',
    }
    const worker = new Worker(options)

    expect(worker.logger).toEqual(mockLogger)
  })

  it('defaults logger if not provided', () => {
    const options = {
      adapter: new MockAdapter(),
      queues: ['*'],
      processName: 'mockProcessName',
    }
    const worker = new Worker(options)

    expect(worker.logger).toEqual(DEFAULT_LOGGER)
  })

  it('extracts processName from options to variable', () => {
    const options = {
      adapter: new MockAdapter(),
      logger: mockLogger,
      queues: ['*'],
      processName: 'mockProcessName',
    }
    const worker = new Worker(options)

    expect(worker.processName).toEqual('mockProcessName')
  })

  it('extracts queue from options to variable', () => {
    const options = {
      adapter: new MockAdapter(),
      logger: mockLogger,
      queues: ['default'],
      processName: 'mockProcessName',
    }
    const worker = new Worker(options)

    expect(worker.queues).toEqual(['default'])
  })

  it('extracts clear from options to variable', () => {
    const options = {
      adapter: new MockAdapter(),
      logger: mockLogger,
      queues: ['*'],
      processName: 'mockProcessName',
      clear: true,
    }
    const worker = new Worker(options)

    expect(worker.clear).toEqual(true)
  })

  it('defaults clear if not provided', () => {
    const options = {
      adapter: new MockAdapter(),
      logger: mockLogger,
      queues: ['*'],
      processName: 'mockProcessName',
    }
    const worker = new Worker(options)

    expect(worker.clear).toEqual(false)
  })

  it('extracts maxAttempts from options to variable', () => {
    const options = {
      adapter: new MockAdapter(),
      logger: mockLogger,
      queues: ['*'],
      processName: 'mockProcessName',
      maxAttempts: 10,
    }
    const worker = new Worker(options)

    expect(worker.maxAttempts).toEqual(10)
  })

  it('extracts maxRuntime from options to variable', () => {
    const options = {
      adapter: new MockAdapter(),
      logger: mockLogger,
      queues: ['*'],
      processName: 'mockProcessName',
      maxRuntime: 10,
    }
    const worker = new Worker(options)

    expect(worker.maxRuntime).toEqual(10)
  })

  it('extracts deleteFailedJobs from options to variable', () => {
    const options = {
      adapter: new MockAdapter(),
      logger: mockLogger,
      queues: ['*'],
      processName: 'mockProcessName',
      deleteFailedJobs: true,
    }
    const worker = new Worker(options)

    expect(worker.deleteFailedJobs).toEqual(true)
  })

  it('extracts sleepDelay from options to variable', () => {
    const options = {
      adapter: new MockAdapter(),
      logger: mockLogger,
      queues: ['*'],
      processName: 'mockProcessName',
      sleepDelay: 5,
    }
    const worker = new Worker(options)

    expect(worker.sleepDelay).toEqual(5000)
  })

  it('can set sleepDelay to 0', () => {
    const options = {
      adapter: new MockAdapter(),
      logger: mockLogger,
      queues: ['*'],
      processName: 'mockProcessName',
      sleepDelay: 0,
    }
    const worker = new Worker(options)

    expect(worker.sleepDelay).toEqual(0)
  })

  it("uses default sleepDelay if it's undefined", () => {
    const options = {
      adapter: new MockAdapter(),
      logger: mockLogger,
      queues: ['*'],
      processName: 'mockProcessName',
      sleepDelay: undefined,
    }
    const worker = new Worker(options)

    expect(worker.sleepDelay).toEqual(5_000)
  })

  it('sets forever', () => {
    const options = {
      adapter: new MockAdapter(),
      logger: mockLogger,
      queues: ['*'],
      processName: 'mockProcessName',
    }
    const worker = new Worker(options)

    expect(worker.forever).toEqual(true)
  })

  it('extracts workoff from options to variable', () => {
    const options = {
      adapter: new MockAdapter(),
      logger: mockLogger,
      queues: ['*'],
      processName: 'mockProcessName',
      workoff: true,
    }
    const worker = new Worker(options)

    expect(worker.workoff).toEqual(true)
  })

  it('defaults workoff if not provided', () => {
    const options = {
      adapter: new MockAdapter(),
      logger: mockLogger,
      processName: 'mockProcessName',
      queues: ['*'],
    }
    const worker = new Worker(options)

    expect(worker.workoff).toEqual(false)
  })

  it('sets lastCheckTime to the current time', () => {
    const options = {
      adapter: new MockAdapter(),
      logger: mockLogger,
      processName: 'mockProcessName',
      queues: ['*'],
    }
    const worker = new Worker(options)

    expect(worker.lastCheckTime).toBeInstanceOf(Date)
  })

  it('throws an error if adapter not set', () => {
    // @ts-expect-error testing error case
    expect(() => new Worker()).toThrow(errors.AdapterRequiredError)
  })

  it('throws an error if queues not set', () => {
    const options = {
      adapter: new MockAdapter(),
    }
    // @ts-expect-error testing error case
    expect(() => new Worker(options)).toThrow(errors.QueuesRequiredError)
  })

  it('throws an error if queues is an empty array', () => {
    const options = {
      adapter: new MockAdapter(),
      queues: [],
    }
    // @ts-expect-error testing error case
    expect(() => new Worker(options)).toThrow(errors.QueuesRequiredError)
  })
})

describe('run', async () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('tries to find a job', async () => {
    const adapter = new MockAdapter()
    const worker = new Worker({
      adapter,
      logger: mockLogger,
      processName: 'mockProcessName',
      queues: ['*'],
      sleepDelay: 0,
      forever: false,
    })

    await worker.run()

    expect(adapter.find).toHaveBeenCalledWith({
      processName: worker.processName,
      maxRuntime: worker.maxRuntime,
      queues: worker.queues,
    })
  })

  it('will try to find jobs in a loop until `forever` is set to `false`', async () => {
    const adapter = new MockAdapter()
    const worker = new Worker({
      adapter,
      logger: mockLogger,
      processName: 'mockProcessName',
      queues: ['*'],
      sleepDelay: 0.01,
      forever: true,
    })

    worker.run()
    // just enough delay to run through the loop twice
    await new Promise((resolve) => setTimeout(resolve, 20))
    worker.forever = false
    expect(adapter.find).toHaveBeenCalledTimes(2)
  })

  it('does nothing if no job found and forever=false', async () => {
    const adapter = new MockAdapter()

    const worker = new Worker({
      adapter,
      logger: mockLogger,
      processName: 'mockProcessName',
      queues: ['*'],
      sleepDelay: 0,
      forever: false,
    })
    await worker.run()

    expect(Executor).not.toHaveBeenCalled()
  })

  it('exits if no job found and workoff=true', async () => {
    const adapter = new MockAdapter()

    const worker = new Worker({
      adapter,
      logger: mockLogger,
      processName: 'mockProcessName',
      queues: ['*'],
      sleepDelay: 0,
      workoff: true,
    })
    await worker.run()

    expect(Executor).not.toHaveBeenCalled()
  })

  it('loops until no job found when workoff=true', async () => {
    const adapter = new MockAdapter()
    adapter.find
      .mockImplementationOnce(() => ({
        id: 1,
        name: 'mockJobName',
        path: 'mockJobPath',
        args: [],
        attempts: 0,
      }))
      .mockImplementationOnce(() => undefined)

    const worker = new Worker({
      adapter,
      logger: mockLogger,
      processName: 'mockProcessName',
      queues: ['*'],
      sleepDelay: 0,
      workoff: true,
    })
    await worker.run()

    expect(Executor).toHaveBeenCalledOnce()
  })

  it('initializes an Executor instance if the job is found', async () => {
    const adapter = new MockAdapter()
    adapter.find.mockImplementationOnce(() => ({
      id: 1,
      name: 'mockJobName',
      path: 'mockJobPath',
      args: [],
      attempts: 0,
    }))
    const worker = new Worker({
      adapter,
      logger: mockLogger,
      processName: 'mockProcessName',
      queues: ['*'],
      sleepDelay: 0,
      forever: false,
      maxAttempts: 10,
      deleteSuccessfulJobs: false,
      deleteFailedJobs: true,
    })

    await worker.run()

    expect(Executor).toHaveBeenCalledWith({
      adapter,
      job: {
        id: 1,
        name: 'mockJobName',
        path: 'mockJobPath',
        args: [],
        attempts: 0,
      },
      logger: worker.logger,
      maxAttempts: 10,
      deleteSuccessfulJobs: false,
      deleteFailedJobs: true,
    })
  })

  it('calls `perform` on the Executor instance', async () => {
    const adapter = new MockAdapter()
    adapter.find.mockImplementationOnce(() => ({
      id: 1,
      name: 'mockJobName',
      path: 'mockJobPath',
      args: [],
      attempts: 0,
    }))
    const worker = new Worker({
      adapter,
      logger: mockLogger,
      processName: 'mockProcessName',
      queues: ['*'],
      sleepDelay: 0,
      forever: false,
    })

    await worker.run()

    expect(Executor.prototype.perform).toHaveBeenCalled()
  })
})
