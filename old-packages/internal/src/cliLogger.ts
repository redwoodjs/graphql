import { defaultLoggerOptions } from '@redwoodjs/api/logger'

// Can't use color in the createLogger logger - so use a simpler set of log fns
const logLevel = defaultLoggerOptions.level
type CLog = (typeof console)['log']

/**
 * An alternative to createLogger which supports the same logging levels
 * but allows for full ANSI when printing to the console.
 */
export const cliLogger: CLog & {
  trace: CLog
  debug: CLog
} = function (...data: any[]) {
  console.log(...data)
}

cliLogger.trace = logLevel === 'trace' ? console.log : () => {}
cliLogger.debug =
  logLevel === 'trace' || logLevel === 'debug' ? console.log : () => {}
