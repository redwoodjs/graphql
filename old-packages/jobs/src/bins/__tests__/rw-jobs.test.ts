import { beforeEach, describe, expect, it, vi } from 'vitest'

import { mockLogger } from '../../core/__tests__/mocks.js'
import { buildNumWorkers, clearQueue, startWorkers } from '../rw-jobs.js'

vi.mock('@redwoodjs/cli-helpers/loadEnvFiles', () => {
  return {
    loadEnvFiles: () => {},
  }
})

const mocks = vi.hoisted(() => {
  return {
    fork: vi.fn(),
  }
})

vi.mock('node:child_process', () => {
  return {
    fork: mocks.fork,
  }
})

describe('buildNumWorkers()', () => {
  it('turns a single worker config into an array of arrays', () => {
    const config = [
      {
        count: 1,
      },
    ]

    const result = buildNumWorkers(config)

    expect(result).toEqual([[0, 0]])
  })

  it('turns a single worker config with more than 1 count an array of arrays', () => {
    const config = [
      {
        count: 2,
      },
    ]

    const result = buildNumWorkers(config)

    expect(result).toEqual([
      [0, 0],
      [0, 1],
    ])
  })

  it('turns multiple worker configs into an array of arrays', () => {
    const config = [
      {
        count: 2,
      },
      {
        count: 3,
      },
    ]

    const result = buildNumWorkers(config)

    expect(result).toEqual([
      [0, 0],
      [0, 1],
      [1, 0],
      [1, 1],
      [1, 2],
    ])
  })
})

describe('startWorkers()', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('forks a single worker', () => {
    const mockWorker = {
      on: () => {},
    }
    mocks.fork.mockImplementation(() => mockWorker)

    startWorkers({ numWorkers: [[0, 0]], logger: mockLogger })

    // single worker only
    expect(mocks.fork).toHaveBeenCalledWith(
      expect.stringContaining('rw-jobs-worker.js'),
      ['--index', '0', '--id', '0'],
      expect.objectContaining({
        detached: false,
        stdio: 'inherit',
      }),
    )
  })

  it('forks multiple workers', () => {
    const mockWorker = {
      on: () => {},
    }
    mocks.fork.mockImplementation(() => mockWorker)

    startWorkers({
      numWorkers: [
        [0, 0],
        [0, 1],
      ],
      logger: mockLogger,
    })

    // first worker
    expect(mocks.fork).toHaveBeenCalledWith(
      expect.stringContaining('rw-jobs-worker.js'),
      ['--index', '0', '--id', '0'],
      expect.any(Object),
    )
    // second worker
    expect(mocks.fork).toHaveBeenCalledWith(
      expect.stringContaining('rw-jobs-worker.js'),
      ['--index', '0', '--id', '1'],
      expect.any(Object),
    )
  })
})

describe('clearQueue()', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('forks a single worker', () => {
    const mockWorker = {
      on: () => {},
    }
    mocks.fork.mockImplementation(() => mockWorker)

    clearQueue({ logger: mockLogger })

    // single worker only
    expect(mocks.fork).toHaveBeenCalledWith(
      expect.stringContaining('rw-jobs-worker.js'),
      ['--clear', '--index', '0', '--id', '0'],
    )
  })
})
