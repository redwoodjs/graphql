import '@testing-library/jest-dom/vitest'

import { cleanup } from '@testing-library/react'
import { afterEach, beforeAll } from 'vitest'

import { startMSW } from './src/web/mockRequests'

afterEach(() => {
  // If vitest globals are enabled testing-library will clean up after each
  // test automatically, but we don't enable globals, so we have to manually
  // clean up here
  // https://testing-library.com/docs/react-testing-library/api/#cleanup
  cleanup()
})

beforeAll(async () => {
  await startMSW('node', {
    onUnhandledRequest: 'error',
  })
})
