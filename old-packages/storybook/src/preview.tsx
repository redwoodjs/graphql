import React from 'react'

import type { Addon_DecoratorFunction, Addon_Loader } from '@storybook/types'

import { MockingLoader, StorybookProvider } from './mocks/StorybookProvider'

const decorators: Addon_DecoratorFunction<any>[] = [
  (storyFn, { id }) => {
    return React.createElement(StorybookProvider, { storyFn, id })
  },
]

const loaders: Addon_Loader<any>[] = [MockingLoader]

export default {
  decorators,
  loaders,
}
