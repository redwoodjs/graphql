import type { ReactNode, ReactPortal } from 'react'
import * as React from 'react'

import {
  setupRequestHandlers,
  startMSW,
  mockCurrentUser,
} from '@redwoodjs/testing/web'

import { MockProviders } from './MockProviders'

export const MockingLoader = async () => {
  /** Need to figure out how to dynamically do this, but also it doesn't seem totally necessary */
  // import.meta.glob('../../src/**/*.mock.{js,ts}', { eager: true })

  await startMSW('browsers')
  setupRequestHandlers()

  return {}
}

export const StorybookProvider: React.FunctionComponent<{
  storyFn: () => ReactNode | ReactPortal
  id: string
}> = ({ storyFn }) => {
  // default to a non-existent user at the beginning of each story
  mockCurrentUser(null)

  return <MockProviders>{storyFn()}</MockProviders>
}
