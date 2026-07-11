import { beforeEach, describe, expect, vi, it } from 'vitest'

import { DEFAULT_LOGGER } from '../../consts.js'
import * as errors from '../../errors.js'
import type { BaseJob } from '../../types.js'
import { Executor } from '../Executor.js'
import type { ExecutorOptions } from '../Executor.js'

import { MockAdapter, mockLogger } from './mocks.js'

const mocks = vi.hoisted(() => {
  return {
    loadJob: vi.fn(),
  }
})

vi.mock('../../loaders.js', () => {
  return {
    loadJob: mocks.loadJob,
  }
})

describe('constructor', () => {
  const mockAdapter = new MockAdapter()
  const mockJob: BaseJob = {
    id: 1,
    name: 'mockJob',
    path: 'mockJob/mockJob',
    args: [],
    attempts: 0,
  }

  it('saves options', () => {
    const options = { adapter: mockAdapter, job: mockJob }
    const executor = new Executor(options)

    expect(executor.options).toEqual(expect.objectContaining(options))
  })

  it('extracts adapter from options to variable', () => {
    const options = { adapter: mockAdapter, job: mockJob }
    const executor = new Executor(options)

    expect(executor.adapter).toEqual(mockAdapter)
  })

  it('extracts job from options to variable', () => {
    const options = { adapter: mockAdapter, job: mockJob }
    const executor = new Executor(options)

    expect(executor.job).toEqual(mockJob)
  })

  it('extracts logger from options to variable', () => {
    const options = {
      adapter: mockAdapter,
      job: mockJob,
      logger: mockLogger,
    }
    const executor = new Executor(options)

    expect(executor.logger).toEqual(mockLogger)
  })

  it('defaults logger if not provided', () => {
    const options = { adapter: mockAdapter, job: mockJob }
    const executor = new Executor(options)

    expect(executor.logger).toEqual(DEFAULT_LOGGER)
  })

  it('throws AdapterRequiredError if adapter is not provided', () => {
    const options = { job: mockJob }

    // @ts-expect-error testing error case
    expect(() => new Executor(options)).toThrow(errors.AdapterRequiredError)
  })

  it('throws JobRequiredError if job is not provided', () => {
    const options = { adapter: mockAdapter }

    // @ts-expect-error testing error case
    expect(() => new Executor(options)).toThrow(errors.JobRequiredError)
  })
})

describe('perform', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('invokes the `perform` method on the job class', async () => {
    const mockAdapter = new MockAdapter()
    const mockJob = {
      id: 1,
      name: 'TestJob',
      path: 'TestJob/TestJob',
      args: ['foo'],
      attempts: 0,

      perform: vi.fn(),
    }

    const options = {
      adapter: mockAdapter,
      logger: mockLogger,
      job: mockJob,
    }
    const executor = new Executor(options)

    // mock the `loadJob` loader to return the job mock
    mocks.loadJob.mockImplementation(() => mockJob)

    await executor.perform()

    expect(mockJob.perform).toHaveBeenCalledWith('foo')
  })

  it('invokes the `success` method on the adapter when job successful', async () => {
    const mockAdapter = new MockAdapter()
    const mockJob = {
      id: 1,
      name: 'TestJob',
      path: 'TestJob/TestJob',
      args: ['foo'],
      attempts: 0,

      perform: vi.fn(),
    }
    const options = {
      adapter: mockAdapter,
      logger: mockLogger,
      job: mockJob,
    }
    const executor = new Executor(options)

    // spy on the success function of the adapter
    const adapterSpy = vi.spyOn(mockAdapter, 'success')
    // mock the `loadJob` loader to return the job mock
    mocks.loadJob.mockImplementation(() => mockJob)

    await executor.perform()

    expect(adapterSpy).toHaveBeenCalledWith({
      job: options.job,
      deleteJob: true,
    })
  })

  it('keeps the job around after successful job if instructed to do so', async () => {
    const mockAdapter = new MockAdapter()
    const mockJob = {
      id: 1,
      name: 'TestJob',
      path: 'TestJob/TestJob',
      args: ['foo'],
      attempts: 0,

      perform: vi.fn(),
    }
    const options: ExecutorOptions = {
      adapter: mockAdapter,
      logger: mockLogger,
      job: mockJob,
      deleteSuccessfulJobs: false,
    }
    const executor = new Executor(options)

    // spy on the success function of the adapter
    const adapterSpy = vi.spyOn(mockAdapter, 'success')
    // mock the `loadJob` loader to return the job mock
    mocks.loadJob.mockImplementation(() => mockJob)

    await executor.perform()

    expect(adapterSpy).toHaveBeenCalledWith({
      job: options.job,
      deleteJob: false,
    })
  })

  it('invokes the `failure` method on the adapter when job fails', async () => {
    const mockAdapter = new MockAdapter()
    const mockError = new Error('mock error in the job perform method')
    const mockJob = {
      id: 1,
      name: 'TestJob',
      path: 'TestJob/TestJob',
      args: ['foo'],
      attempts: 0,

      perform: vi.fn(() => {
        throw mockError
      }),
    }
    const options = {
      adapter: mockAdapter,
      logger: mockLogger,
      job: mockJob,
    }
    const executor = new Executor(options)

    // spy on the success function of the adapter
    const adapterSpy = vi.spyOn(mockAdapter, 'error')
    // mock the `loadJob` loader to return the job mock
    mocks.loadJob.mockImplementation(() => mockJob)

    await executor.perform()

    expect(adapterSpy).toHaveBeenCalledWith({
      job: options.job,
      error: mockError,
    })
  })
})
