import { beforeAll } from 'vitest'

// Disable telemetry within framework tests
beforeAll(() => {
  process.env.REDWOOD_DISABLE_TELEMETRY = '1'
})
