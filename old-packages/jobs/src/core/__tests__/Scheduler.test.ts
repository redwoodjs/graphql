import { describe, expect, vi, it, beforeEach } from 'vitest'

import {
  DEFAULT_PRIORITY,
  DEFAULT_WAIT,
  DEFAULT_WAIT_UNTIL,
} from '../../consts.js'
import * as errors from '../../errors.js'
import { Scheduler } from '../Scheduler.js'

import { MockAdapter, mockLogger } from './mocks.js'

vi.useFakeTimers()

describe('constructor', () => {
  const mockAdapter = new MockAdapter()

  it('saves adapter', () => {
    const scheduler = new Scheduler({
      adapter: mockAdapter,
      logger: mockLogger,
    })

    expect(scheduler.adapter).toEqual(mockAdapter)
  })

  it('saves logger', () => {
    const scheduler = new Scheduler({
      adapter: mockAdapter,
      logger: mockLogger,
    })

    expect(scheduler.logger).toEqual(mockLogger)
  })
})

describe('computeRunAt()', () => {
  const mockAdapter = new MockAdapter()

  it('returns a Date `wait` seconds in the future if `wait` set', () => {
    const scheduler = new Scheduler({
      adapter: mockAdapter,
      logger: mockLogger,
    })
    const wait = 10

    expect(
      scheduler.computeRunAt({ wait, waitUntil: DEFAULT_WAIT_UNTIL }),
    ).toEqual(new Date(Date.now() + wait * 1000))
  })

  it('returns the `waitUntil` Date, if set', () => {
    const scheduler = new Scheduler({
      adapter: mockAdapter,
      logger: mockLogger,
    })
    const waitUntil = new Date(2030, 0, 1, 12, 34, 56)

    expect(scheduler.computeRunAt({ wait: DEFAULT_WAIT, waitUntil })).toEqual(
      waitUntil,
    )
  })

  it('falls back to now', () => {
    const scheduler = new Scheduler({
      adapter: mockAdapter,
      logger: mockLogger,
    })

    expect(
      scheduler.computeRunAt({ wait: 0, waitUntil: DEFAULT_WAIT_UNTIL }),
    ).toEqual(new Date())
    expect(
      scheduler.computeRunAt({ wait: DEFAULT_WAIT, waitUntil: null }),
    ).toEqual(new Date())
  })
})

describe('buildPayload()', () => {
  const mockAdapter = new MockAdapter()

  it('returns a payload object', () => {
    const scheduler = new Scheduler({
      adapter: mockAdapter,
      logger: mockLogger,
    })
    const job = {
      id: 1,
      name: 'JobName',
      path: 'JobPath/JobPath',
      queue: 'default',
      priority: 25 as const,

      perform: vi.fn(),
    }
    const args = [{ foo: 'bar' }]
    const payload = scheduler.buildPayload({ job, args })

    expect(payload.name).toEqual(job.name)
    expect(payload.path).toEqual(job.path)
    expect(payload.args).toEqual(args)
    expect(payload.runAt).toEqual(new Date())
    expect(payload.queue).toEqual(job.queue)
    expect(payload.priority).toEqual(job.priority)
  })

  it('falls back to a default priority', () => {
    const scheduler = new Scheduler({
      adapter: mockAdapter,
      logger: mockLogger,
    })
    const job = {
      id: 1,
      name: 'JobName',
      path: 'JobPath/JobPath',
      queue: 'default',

      perform: vi.fn(),
    }
    const payload = scheduler.buildPayload({ job, args: [] })

    expect(payload.priority).toEqual(DEFAULT_PRIORITY)
  })

  it('takes into account a `wait` time', () => {
    const scheduler = new Scheduler({
      adapter: mockAdapter,
      logger: mockLogger,
    })
    const job = {
      id: 1,
      name: 'JobName',
      path: 'JobPath/JobPath',
      queue: 'default',
      priority: 25 as const,

      perform: vi.fn(),
    }
    const options = { wait: 10 }
    const payload = scheduler.buildPayload({ job, args: [], options })

    expect(payload.runAt).toEqual(new Date(Date.now() + options.wait * 1000))
  })

  it('takes into account a `waitUntil` date', () => {
    const scheduler = new Scheduler({
      adapter: mockAdapter,
      logger: mockLogger,
    })
    const job = {
      id: 1,
      name: 'JobName',
      path: 'JobPath/JobPath',
      queue: 'default',
      priority: 25 as const,

      perform: vi.fn(),
    }
    const options = { waitUntil: new Date(2030, 0, 1, 12, 34, 56) }
    const payload = scheduler.buildPayload({ job, args: [], options })

    expect(payload.runAt).toEqual(options.waitUntil)
  })

  it('throws an error if no queue set', async () => {
    const scheduler = new Scheduler({
      adapter: mockAdapter,
      logger: mockLogger,
    })
    const job = {
      id: 1,
      name: 'JobName',
      path: 'JobPath/JobPath',
      priority: 25 as const,

      perform: vi.fn(),
    }

    // @ts-expect-error testing error case
    expect(() => scheduler.buildPayload({ job, args: [] })).toThrow(
      errors.QueueNotDefinedError,
    )
  })
})

describe('schedule()', () => {
  const mockAdapter = new MockAdapter()

  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('calls the schedule() method on the adapter', async () => {
    const scheduler = new Scheduler({
      adapter: mockAdapter,
      logger: mockLogger,
    })
    const job = {
      id: 1,
      name: 'JobName',
      path: 'JobPath/JobPath',
      queue: 'default',

      perform: vi.fn(),
    }
    const args = [{ foo: 'bar' }]
    const options = {
      wait: 10,
    }

    await scheduler.schedule({ job, args, options })

    expect(mockAdapter.schedule).toHaveBeenCalledWith(
      expect.objectContaining({
        name: job.name,
        args: args,
      }),
    )
  })

  it('re-throws any error that occurs during scheduling', async () => {
    mockAdapter.schedule.mockImplementationOnce(() => {
      throw new Error('Could not schedule')
    })

    const scheduler = new Scheduler({
      adapter: mockAdapter,
      logger: mockLogger,
    })
    const job = {
      id: 1,
      name: 'JobName',
      path: 'JobPath/JobPath',
      queue: 'default',

      perform: vi.fn(),
    }
    const args = [{ foo: 'bar' }]
    const options = {
      wait: 10,
    }

    await expect(scheduler.schedule({ job, args, options })).rejects.toThrow(
      errors.SchedulingError,
    )
  })
})
