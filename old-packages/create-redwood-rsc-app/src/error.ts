export class ExitCodeError extends Error {
  exitCode: number

  constructor(exitCode: number, message: string) {
    super(message)
    this.exitCode = exitCode
  }
}

export function handleError(e: unknown) {
  // using process.exitCode instead of `process.exit(1) to give Node a chance to properly
  // clean up
  // See https://github.com/eslint-community/eslint-plugin-n/blob/master/docs/rules/no-process-exit.md

  if (e instanceof ExitCodeError) {
    if (e.exitCode === 0) {
      console.log('👋 Exiting')
    } else {
      console.log()
      console.error('🚨 An error occurred:')
      console.error(e.message)
    }

    process.exitCode = e.exitCode
  } else if (typeof e === 'string' || e instanceof String) {
    console.log()

    if (e) {
      console.error('🚨 An error occurred:')
      console.error(e)
    } else {
      console.error('🚨 An error occurred')
    }
  } else {
    console.log()
    if (typeof e === 'object' && e !== null && 'message' in e) {
      console.error('🚨 An error occurred:')
      console.error(e)
    } else {
      console.error('🚨 An error occurred')
    }

    process.exitCode = 1
  }
}
