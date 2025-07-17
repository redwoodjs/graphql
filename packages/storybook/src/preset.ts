import path from 'node:path'

import type { PresetProperty } from '@storybook/types'
import { mergeConfig } from 'vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

import { getPaths } from '@redwoodjs/project-config'

import { autoImports } from './plugins/auto-imports'
import { mockAuth } from './plugins/mock-auth'
import { mockRouter } from './plugins/mock-router'
import { reactDocgen } from './plugins/react-docgen'
import type { StorybookConfig } from './types'

const getAbsolutePath = (input: string) =>
  path.dirname(require.resolve(path.join(input, 'package.json')))

export const core: PresetProperty<'core'> = {
  builder: getAbsolutePath('@storybook/builder-vite'),
  renderer: getAbsolutePath('@storybook/react'),
}

export const previewAnnotations: StorybookConfig['previewAnnotations'] = (
  entry,
) => {
  return [...entry, require.resolve('./preview.js')]
}

const redwoodProjectPaths = getPaths()

export const viteFinal: StorybookConfig['viteFinal'] = async (config) => {
  const { plugins = [] } = config

  // Needs to run before the react plugin, so add to the front
  plugins.unshift(reactDocgen())
  plugins.unshift(nodePolyfills())

  return mergeConfig(config, {
    // This is necessary as it otherwise just points to the `web` directory,
    // but it needs to point to `web/src`
    root: redwoodProjectPaths.web.src,
    plugins: [mockRouter(), mockAuth(), autoImports],
    resolve: {
      alias: {
        '~__REDWOOD__USER_ROUTES_FOR_MOCK': redwoodProjectPaths.web.routes,
        '~__REDWOOD__USER_WEB_SRC': redwoodProjectPaths.web.src,
      },
    },
    optimizeDeps: {
      // Without this, on first run, Vite throws: `The file does not exist at
      // "{project path}/web/node_modules/.cache/sb-vite/deps/DocsRenderer-NNNQARDV-DEXCJJZJ.js?v=c640a8fa"
      // which is in the optimize deps directory.`
      // This refers to @storybook/addon-docs, which is included as part of @storybook/addon-essentials.
      // the docs addon then includes itself here: https://github.com/storybookjs/storybook/blob/a496ec48c708eed753a5251d55fa07947a869e62/code/addons/docs/src/preset.ts#L198C3-L198C27
      // which I believe gets included by the builder here: https://github.com/storybookjs/storybook/blob/a496ec48c708eed753a5251d55fa07947a869e62/code/builders/builder-vite/src/optimizeDeps.ts#L117
      // TODO: Figure out why this error is being thrown so that this can be removed.
      exclude: ['@storybook/addon-docs'],
    },
  })
}
