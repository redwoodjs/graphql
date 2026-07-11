import yargs_parser from 'yargs-parser'

import { lazy } from '../x/decorators'

/**
 * A value class wrapping a Redwood command string.
 * - perform basic validation on construction
 * - used throughout the package to representa a command (instead of using 'string')
 */
export class RedwoodCommandString {
  isComplete = true

  /**
   * this is what we can pass down to the actual CLI
   * it doesn't include "yarn redwood"
   * ex: "generate page Foo /foo"
   */
  processed: string
  constructor(public original: string) {
    let v = original

    if (typeof v !== 'string') {
      throw new Error('redwood command must be a string')
    }

    if (v.trim().endsWith('...')) {
      this.isComplete = false
      const pp = v.split('...')
      pp.pop()
      v = pp.join('')
    }

    const parts = v
      .trim()
      .split(' ')
      .map((s) => s.trim())
    if (parts[0] === 'yarn') {
      parts.shift()
    }
    if (parts[0] === 'redwood' || parts[0] === 'rw') {
      parts.shift()
    }
    this.processed = parts.join(' ')
  }
  @lazy() get parsed() {
    return yargs_parser(this.processed)
  }

  @lazy() get isInterceptable() {
    let a = this.parsed._[0]
    const b = this.parsed._[1]
    if (a === 'g') {
      a = 'generate'
    }
    if (a !== 'generate') {
      return false
    }
    if (b === 'sdl') {
      return false
    } // <-- why?
    if (b === 'scaffold') {
      return false
    } // <-- why?
    return true
  }
}
