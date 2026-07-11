import type { ReactNode, ReactPortal } from 'react'
import * as React from 'react'

import {
  setupRequestHandlers,
  startMSW,
  mockCurrentUser,
} from '@redwoodjs/testing/web'

import { MockProviders } from './MockProviders'

export const MockingLoader = async () => {
  /**
   * Without this, the mock files are only loaded directly when
   * rendering the corresponding cell.
   * What that means is that without this, any component
   * that uses a cell will not have the mock data.
   *
   * Additionally, because we want to load the mock files eagerly,
   * we need to pass the `eager: true` option.
   *
   * More info on Glob Import here: https://vitejs.dev/guide/features#glob-import
   */
  import.meta.glob('~__REDWOOD__USER_WEB_SRC/**/*.+(mock).(js|ts)', {
    eager: true,
  })

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
