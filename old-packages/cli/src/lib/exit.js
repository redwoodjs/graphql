import chalk from 'chalk'
import terminalLink from 'terminal-link'
import { v4 as uuidv4 } from 'uuid'

import {
  recordTelemetryAttributes,
  recordTelemetryError,
} from '@redwoodjs/cli-helpers'

const DEFAULT_ERROR_EPILOGUE = [
  'Need help?',
  ` - Not sure about something or need advice? Reach out on our ${terminalLink(
    'Forum',
    'https://community.redwoodjs.com/',
  )}`,
  ` - Think you've found a bug? Open an issue on our ${terminalLink(
    'GitHub',
    'https://github.com/redwoodjs/redwood',
  )}`,
].join('\n')

export function exitWithError(
  error,
  { exitCode, message, epilogue, includeEpilogue, includeReferenceCode } = {},
) {
  // Set the default values
  exitCode ??= error?.exitCode ?? 1
  epilogue ??= DEFAULT_ERROR_EPILOGUE
  includeEpilogue ??= true
  includeReferenceCode ??= true

  // Determine the correct error message
  message ??= error.stack ?? (error.toString() || 'Unknown error')

  // Generate a unique reference code for the error which can be used to look up
  // the error in telemetry if needed and if the user chooses to share it
  const errorReferenceCode = uuidv4()

  const line = chalk.red('-'.repeat(process.stderr.columns))

  // Generate and print a nice message to the user
  const content = !includeEpilogue
    ? message
    : [
        '',
        line,
        message,
        `\n${line}`,
        epilogue,
        includeReferenceCode &&
          ` - Here's your unique error reference to quote: '${errorReferenceCode}'`,
        line,
      ]
        .filter(Boolean)
        .join('\n')

  console.error(content)

  // Record the error in telemetry
  recordTelemetryError(error ?? new Error(message))
  recordTelemetryAttributes({ errorReferenceCode })

  process.exit(exitCode)
}
