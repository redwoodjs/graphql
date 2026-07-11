import { getPaths as _getPaths } from '@redwoodjs/project-config'

import { colors } from './colors.js'

function isErrorWithMessage(e: any): e is { message: string } {
  return !!e.message
}

/**
 * This wraps the core version of getPaths into something that catches the exception
 * and displays a helpful error message.
 */
export function getPaths() {
  try {
    return _getPaths()
  } catch (e) {
    if (isErrorWithMessage(e)) {
      console.error(colors.error(e.message))
    }

    process.exit(1)
  }
}
