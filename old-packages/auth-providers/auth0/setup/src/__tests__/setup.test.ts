import { vi, test, expect } from 'vitest'

import { command, description, builder, handler } from '../setup'

// mock Telemetry for CLI commands so they don't try to spawn a process
vi.mock('@redwoodjs/telemetry', () => {
  return {
    errorTelemetry: () => jest.fn(),
    timedTelemetry: () => jest.fn(),
  }
})

test('standard exports', () => {
  expect(command).toEqual('auth0')
  expect(description).toMatch(/Auth0/)
  expect(typeof builder).toEqual('function')
  expect(typeof handler).toEqual('function')
})
