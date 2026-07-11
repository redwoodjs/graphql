import chalk from 'chalk'

import type { Config } from './config.js'

import { getCrwrscaVersion } from './version.js'

export function printWelcome() {
  console.log()
  console.log(
    chalk
      .hex('bf4722')
      .bold(
        '🌲 Welcome to the RedwoodJS RSC quick-start installer ' +
          `v${getCrwrscaVersion()} 🌲`,
      ),
  )
  console.log()
  console.log(
    'This installer is designed to get you started as fast as possible.',
  )
  console.log(
    'If you need a more customized setup, please use the official installer ' +
      'by running `yarn create redwood-app`',
  )
  console.log()
}

export function printDone(config: Config) {
  console.log()
  console.log('🎉 Done!')
  console.log()
  console.log(
    'You can now run the following commands to build and serve the included ' +
      'example application',
  )
  console.log()
  console.log(chalk.hex('cef792')('> cd ' + config.installationDir))
  console.log(chalk.hex('cef792')('> yarn rw build -v && yarn rw serve'))
}
