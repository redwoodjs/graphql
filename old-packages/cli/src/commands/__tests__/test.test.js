globalThis.__dirname = __dirname
import '../../lib/test'

vi.mock('execa', () => ({
  default: vi.fn((cmd, params) => ({
    cmd,
    params,
  })),
}))

import execa from 'execa'
import { vi, afterEach, test, expect } from 'vitest'

import { handler } from '../test'

vi.mock('@redwoodjs/structure', () => {
  return {
    getProject: () => ({
      sides: ['web', 'api'],
    }),
  }
})

// Before rw tests run, api/ and web/ `jest.config.js` is confirmed via existsSync()
vi.mock('fs-extra', async (importOriginal) => {
  const originalFsExtra = await importOriginal()
  return {
    default: {
      ...originalFsExtra,
      existsSync: () => true,
    },
  }
})

afterEach(() => {
  vi.clearAllMocks()
})

test('Runs tests for all available sides if no filter passed', async () => {
  await handler({})

  expect(execa.mock.results[0].value.cmd).toBe('yarn jest')
  expect(execa.mock.results[0].value.params).toContain('web')
  expect(execa.mock.results[0].value.params).toContain('api')
})

test('Syncs or creates test database when the flag --db-push is set to true', async () => {
  await handler({
    filter: ['api'],
    dbPush: true,
  })

  expect(execa.mock.results[0].value.cmd).toBe('yarn jest')

  expect(execa.mock.results[0].value.params).toContain('--projects', 'api')
})

test('Skips test database sync/creation when the flag --db-push is set to false', async () => {
  await handler({
    filter: ['api'],
    dbPush: false,
  })

  expect(execa.mock.results[0].value.cmd).toBe('yarn jest')
})

test('Runs tests for all available sides if no side filter passed', async () => {
  await handler({
    filter: ['bazinga'],
  })

  expect(execa.mock.results[0].value.cmd).toBe('yarn jest')
  expect(execa.mock.results[0].value.params).toContain('bazinga')
  expect(execa.mock.results[0].value.params).toContain('web')
  expect(execa.mock.results[0].value.params).toContain('api')
})

test('Runs tests specified side if even with additional filters', async () => {
  await handler({
    filter: ['web', 'bazinga'],
  })

  expect(execa.mock.results[0].value.cmd).not.toBe('yarn rw')
  expect(execa.mock.results[0].value.params).not.toContain('api')

  expect(execa.mock.results[0].value.cmd).toBe('yarn jest')
  expect(execa.mock.results[0].value.params).toContain('bazinga')
  expect(execa.mock.results[0].value.params).toContain('web')
})

test('Does not create db when calling test with just web', async () => {
  await handler({
    filter: ['web'],
  })

  expect(execa.mock.results[0].value.cmd).toBe('yarn jest')
})

test('Passes filter param to jest command if passed', async () => {
  await handler({
    filter: ['web', 'bazinga'],
  })

  expect(execa.mock.results[0].value.cmd).toBe('yarn jest')
  expect(execa.mock.results[0].value.params).toContain('bazinga')
})

test('Passes other flags to jest', async () => {
  await handler({
    u: true,
    debug: true,
    json: true,
    collectCoverage: true,
  })

  expect(execa.mock.results[0].value.cmd).toBe('yarn jest')
  expect(execa.mock.results[0].value.params).toContain('-u')
  expect(execa.mock.results[0].value.params).toContain('--debug')
  expect(execa.mock.results[0].value.params).toContain('--json')
  expect(execa.mock.results[0].value.params).toContain('--collectCoverage')
})

test('Passes values of other flags to jest', async () => {
  await handler({
    bazinga: false,
    hello: 'world',
  })

  // Second command because api side runs
  expect(execa.mock.results[0].value.cmd).toBe('yarn jest')

  // Note that these below tests aren't the best, since they don't check for order
  // But I'm making sure only 2 extra params get passed
  expect(execa.mock.results[0].value.params).toEqual(
    expect.arrayContaining(['--bazinga', false]),
  )

  expect(execa.mock.results[0].value.params).toEqual(
    expect.arrayContaining(['--hello', 'world']),
  )
})
