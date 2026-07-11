import { vi } from 'vitest'

import type {
  ErrorOptions,
  FailureOptions,
  FindArgs,
  SchedulePayload,
  SuccessOptions,
} from '../../adapters/BaseAdapter/BaseAdapter.js'
import { BaseAdapter } from '../../adapters/BaseAdapter/BaseAdapter.js'
import type { BasicLogger, PossibleBaseJob } from '../../types.js'

export const mockLogger: BasicLogger = {
  info: vi.fn(() => {}),
  debug: vi.fn(() => {}),
  warn: vi.fn(() => {}),
  error: vi.fn(() => {}),
}

export class MockAdapter extends BaseAdapter {
  constructor() {
    super({
      logger: mockLogger,
    })
  }

  schedule = vi.fn((_payload: SchedulePayload): void => {})
  find = vi.fn((_args: FindArgs): PossibleBaseJob => undefined)
  success = vi.fn((_options: SuccessOptions): void => {})
  error = vi.fn((_options: ErrorOptions): void => {})
  failure = vi.fn((_options: FailureOptions): void => {})
  clear = vi.fn((): void => {})
}
