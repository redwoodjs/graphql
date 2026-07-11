import crypto from 'node:crypto'

import terminalLink from 'terminal-link'

import { recordTelemetryAttributes } from '@redwoodjs/cli-helpers'

export const DEFAULT_LENGTH = 32

export const generateSecret = (length = DEFAULT_LENGTH) => {
  return crypto.randomBytes(length).toString('base64')
}

export const command = 'secret'
export const description =
  'Generates a secret key using a cryptographically-secure source of entropy'

export const builder = (yargs) =>
  yargs
    .option('length', {
      description: 'Length of the generated secret',
      type: 'integer',
      required: false,
      default: DEFAULT_LENGTH,
    })
    .option('raw', {
      description: 'Prints just the raw secret',
      type: 'boolean',
      required: false,
      default: false,
    })
    .epilogue(
      `Also see the ${terminalLink(
        'Redwood CLI Reference',
        'https://redwoodjs.com/docs/cli-commands#generate-secret',
      )}`,
    )

export const handler = ({ length, raw }) => {
  recordTelemetryAttributes({
    command: 'generate secret',
    length,
    raw,
  })

  if (raw) {
    console.log(generateSecret(length))
    return
  }

  console.info('')
  console.info(`  ${generateSecret(length)}`)
  console.info('')
  console.info(
    "If you're using this with dbAuth, set a SESSION_SECRET environment variable to this value.",
  )
  console.info('')
  console.info('Keep it secret, keep it safe!')
}
