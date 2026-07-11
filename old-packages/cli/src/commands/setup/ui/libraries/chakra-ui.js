import path from 'path'

import execa from 'execa'
import { Listr } from 'listr2'

import { recordTelemetryAttributes } from '@redwoodjs/cli-helpers'

import { getPaths, writeFile } from '../../../../lib'
import c from '../../../../lib/colors'
import extendStorybookConfiguration from '../../../../lib/configureStorybook.js'
import { extendJSXFile, fileIncludes } from '../../../../lib/extendFile'

export const command = 'chakra-ui'
export const description = 'Set up Chakra UI'

export function builder(yargs) {
  yargs.option('force', {
    alias: 'f',
    default: false,
    description: 'Overwrite existing configuration',
    type: 'boolean',
  })
  yargs.option('install', {
    alias: 'i',
    default: true,
    description: 'Install packages',
    type: 'boolean',
  })
}

const CHAKRA_THEME_AND_COMMENTS = `\
// This object will be used to override Chakra-UI theme defaults.
// See https://chakra-ui.com/docs/styled-system/theming/theme for theming options
const theme = {}
export default theme
`

export async function handler({ force, install }) {
  recordTelemetryAttributes({
    command: 'setup ui chakra-ui',
    force,
    install,
  })

  const rwPaths = getPaths()

  const packages = [
    '@chakra-ui/react@^2',
    '@emotion/react@^11',
    '@emotion/styled@^11',
    'framer-motion@^11',
  ]

  const tasks = new Listr(
    [
      {
        title: 'Installing packages...',
        skip: () => !install,
        task: () => {
          return new Listr(
            [
              {
                title: `Install ${packages.join(', ')}`,
                task: async () => {
                  await execa('yarn', ['workspace', 'web', 'add', ...packages])
                },
              },
            ],
            { rendererOptions: { collapseSubtasks: false } },
          )
        },
      },
      {
        title: 'Setting up Chakra UI...',
        skip: () => fileIncludes(rwPaths.web.app, 'ChakraProvider'),
        task: () =>
          extendJSXFile(rwPaths.web.app, {
            insertComponent: {
              name: 'ChakraProvider',
              props: { theme: 'extendedTheme' },
              within: 'RedwoodProvider',
              insertBefore: '<ColorModeScript />',
            },
            imports: [
              "import { ChakraProvider, ColorModeScript, extendTheme } from '@chakra-ui/react'",
              "import * as theme from 'config/chakra.config'",
            ],
            moduleScopeLines: ['const extendedTheme = extendTheme(theme)'],
          }),
      },
      {
        title: `Creating Theme File...`,
        task: () => {
          writeFile(
            path.join(rwPaths.web.config, 'chakra.config.js'),
            CHAKRA_THEME_AND_COMMENTS,
            { overwriteExisting: force },
          )
        },
      },
      {
        title: 'Configure Storybook...',
        // skip this task if the user's storybook config already includes "withChakra"
        skip: () => fileIncludes(rwPaths.web.storybookConfig, 'withChakra'),
        task: async () =>
          extendStorybookConfiguration(
            path.join(
              __dirname,
              '..',
              'templates',
              'chakra.storybook.preview.tsx.template',
            ),
          ),
      },
    ],
    { rendererOptions: { collapseSubtasks: false } },
  )

  try {
    await tasks.run()
  } catch (e) {
    console.error(c.error(e.message))
    process.exit(e?.exitCode || 1)
  }
}
