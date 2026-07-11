vi.mock('execa', () => ({
  default: vi.fn((cmd, params, options) => {
    return {
      cmd,
      params,
      options,
    }
  }),
}))

vi.mock('concurrently', () => ({
  default: vi.fn((commands, options) => ({
    commands,
    options,
  })),
}))

import '../../lib/mockTelemetry'

let mockedRedwoodConfig = {
  api: {},
  web: {},
  browser: {},
}

vi.mock('../../lib', async (importOriginal) => {
  const originalLib = await importOriginal()
  return {
    ...originalLib,
    runCommandTask: vi.fn((commands) => {
      return commands.map(({ cmd, args }) => `${cmd} ${args?.join(' ')}`)
    }),
    getPaths: () => ({
      base: './myBasePath',
      api: {
        dbSchema: '../../__fixtures__/example-todo-main/api/prisma',
      },
      web: {},
    }),
    getConfig: () => {
      return mockedRedwoodConfig
    },
  }
})

vi.mock('../../commands/upgrade', () => {
  return {
    getCmdMajorVersion: () => 3,
  }
})

import path from 'path'

import concurrently from 'concurrently'
import execa from 'execa'
import { vi, beforeEach, afterEach, test, expect } from 'vitest'

import { runCommandTask } from '../../lib'
import { handler } from '../type-check'

beforeEach(() => {
  vi.spyOn(console, 'info').mockImplementation(() => {})
  vi.spyOn(console, 'log').mockImplementation(() => {})
})

afterEach(() => {
  vi.clearAllMocks()
  console.info.mockRestore()
  console.log.mockRestore()
})

test('Should run tsc commands correctly, in order', async () => {
  await handler({
    sides: ['web', 'api'],
    prisma: false,
    generate: true,
  })

  const concurrentlyArgs = concurrently.mock.results[0].value

  expect(execa.mock.results[0].value.cmd).toEqual('yarn rw-gen')

  // Ensure tsc command run correctly for web side
  expect(concurrentlyArgs.commands).toContainEqual({
    cwd: path.join('myBasePath', 'web'),
    command: 'yarn  tsc --noEmit --skipLibCheck',
  })
  // Ensure tsc command run correctly for web side
  expect(concurrentlyArgs.commands).toContainEqual({
    cwd: path.join('myBasePath', 'api'),
    command: 'yarn  tsc --noEmit --skipLibCheck',
  })
  // Ensure we have raw sequential output from tsc
  expect(concurrentlyArgs.options).toEqual({ group: true, raw: true })
})

test('Should generate prisma client', async () => {
  await handler({
    sides: ['api'],
    prisma: true,
    generate: true,
  })

  const concurrentlyArgs = concurrently.mock.results[0].value

  expect(execa.mock.results[0].value.cmd).toEqual('yarn rw-gen')

  // Ensure tsc command run correctly for web side
  expect(concurrentlyArgs.commands).toContainEqual({
    cwd: path.join('myBasePath', 'api'),
    command: 'yarn  tsc --noEmit --skipLibCheck',
  })
  expect(runCommandTask.mock.results[0].value[0]).toMatch(
    /.+(\\|\/)prisma(\\|\/)build(\\|\/)index.js.+/,
  )
})
