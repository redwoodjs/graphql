//

import stream from 'stream'

import boxen from 'boxen'
import chalk from 'chalk'
import { prompt as enquirerPrompt } from 'enquirer'
import { UpdateManager } from 'stdout-update'

/**
 * A default set of styling for the TUI, designed for a cohesive look and feel around the Redwood CLI, CRWA and vairous plugins
 */
export const RedwoodStyling = {
  error: chalk.bold.red,
  warning: chalk.keyword('orange'),
  success: chalk.greenBright,
  info: chalk.grey,

  header: chalk.bold.underline.hex('#e8e8e8'),
  cmd: chalk.hex('#808080'),
  redwood: chalk.hex('#ff845e'),
  love: chalk.redBright,

  green: chalk.green,
}

/**
 * An object used to describe a "reactive" TUI element, that is an element that is updated a number of times per second
 */
export class ReactiveTUIContent {
  private outStream?: stream.Writable

  private mode: 'text' | 'stream'
  private header: string
  private content: string
  private spinner: {
    enabled: boolean
    characters: string[]
  }
  private boxen: boxen.Options
  private frameInterval: number

  // TODO: Implement a progress bar

  private spinnerIndex = 0

  constructor(options: {
    mode?: 'text' | 'stream'
    header?: string
    content?: string
    spinner?: {
      enabled?: boolean
      characters?: string[]
    }
    boxen?: boxen.Options
    outStream?: stream.Readable
    frameInterval?: number
  }) {
    this.mode = options.mode || 'text'
    this.header = options.header || ''
    this.content = options.content || ''

    const defaultSpinner = {
      enabled: false,
      characters: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'].map((c) =>
        RedwoodStyling.redwood(c),
      ),
    }

    // Validate spinner.characters if provided
    if (
      options.spinner?.characters !== undefined &&
      (!Array.isArray(options.spinner.characters) ||
        options.spinner.characters.length < 2)
    ) {
      throw new Error(
        'tui: `spinner.characters` must be an array with at least 2 entries',
      )
    }

    this.spinner = { ...defaultSpinner, ...options.spinner }
    this.boxen = { ...options.boxen }

    // Validate frameInterval if provided
    if (options.frameInterval !== undefined) {
      if (
        typeof options.frameInterval !== 'number' ||
        options.frameInterval <= 0
      ) {
        throw new Error('tui: `frameInterval` must be a number > 0')
      }
      this.frameInterval = options.frameInterval
    } else {
      this.frameInterval = 80
    }

    if (options.outStream) {
      this.setOutStream(options.outStream)
    }
  }

  update(options: {
    mode?: 'text' | 'stream'
    header?: string
    content?: string
    spinner?: {
      enabled?: boolean
      characters?: string[]
    }
    boxen?: boxen.Options
    outStream?: stream.Readable
    frameInterval?: number
  }) {
    if (options.mode) {
      this.mode = options.mode
    }
    if (options.header !== undefined) {
      this.header = options.header
    }
    if (options.content !== undefined) {
      this.content = options.content
    }
    if (options.spinner) {
      // Validate characters array has at least two characters (if provided)
      if (
        options.spinner.characters !== undefined &&
        (!Array.isArray(options.spinner.characters) ||
          options.spinner.characters.length < 2)
      ) {
        throw new Error(
          'tui: `spinner.characters` must be an array with at least 2 entries',
        )
      }
      this.spinner = { ...this.spinner, ...options.spinner }
    }
    if (options.boxen) {
      this.boxen = { ...this.boxen, ...options.boxen }
    }
    if (options.outStream) {
      this.setOutStream(options.outStream)
    }
    if (options.frameInterval !== undefined) {
      // Validate > 0
      if (
        typeof options.frameInterval !== 'number' ||
        options.frameInterval <= 0
      ) {
        throw new Error('tui: `frameInterval` must be a number > 0')
      }
      this.frameInterval = options.frameInterval
    }
  }

  setOutStream(out: stream.Readable) {
    this.outStream = new stream.Writable({
      write: (chunk: Buffer, _encoding, next) => {
        if (this.content === 'stream') {
          this.content += chunk.toString('utf-8')
        }
        next()
        return true
      },
    })
    out.pipe(this.outStream, { end: true })
  }

  renderToString(): string {
    // Stream based content
    if (this.mode === 'stream') {
      return 'Not implemented yet'
    }

    // Text based content
    let renderedString = this.content

    // Add the header if it exists
    if (this.header) {
      renderedString = `${this.header}\n${renderedString}`
    }

    // Add a spinner if enabled
    if (this.spinner.enabled) {
      renderedString = `${
        this.spinner.characters[this.spinnerIndex]
      } ${renderedString}`

      // Increment the spinner index and reset if necessary
      this.spinnerIndex += 1
      if (this.spinnerIndex >= this.spinner.characters.length) {
        this.spinnerIndex = 0
      }
    }

    return renderedString
  }

  getFrameInterval() {
    return this.frameInterval
  }
}

/**
 * RedwoodTUI
 *
 * A thin wrapper around stdout/stderr that renders static text and
 * "reactive" content (e.g., spinners) to the terminal. It coordinates a
 * shared UpdateManager, handles TTY/non-TTY output, and provides helpers
 * for prompting and boxed messages.
 *
 * Typical usage:
 *   const tui = new RedwoodTUI()
 *   const content = new ReactiveTUIContent({ spinner: { enabled: true } })
 *   tui.startReactive(content)
 *   // ...work...
 *   tui.stopReactive(true)
 */
export class RedwoodTUI {
  private manager: UpdateManager

  private outStream: NodeJS.WriteStream
  private errStream: NodeJS.WriteStream

  private timerId?: NodeJS.Timeout
  private isReactive = false

  private reactiveContent?: ReactiveTUIContent

  constructor({ out, err }: RedwoodTUIConfig = {}) {
    this.outStream = out || process.stdout
    this.errStream = err || process.stderr
    this.manager = UpdateManager.getInstance(this.outStream, this.errStream)

    // Stop any remaining reactive content or there could be side effects like the cursor being hidden
    process.on('exit', () => {
      this.stopReactive()
    })
  }

  /**
   * Enables rendering of a reactive component to the TUI
   *
   * @param reactiveContent A new ReactiveTUIContent object set as the current reactive content
   */
  startReactive(reactiveContent?: ReactiveTUIContent) {
    // Stop any existing reactive content
    if (this.isReactive) {
      this.stopReactive()
    }

    // Set the reactive content if passed in
    if (reactiveContent) {
      this.reactiveContent = reactiveContent
    }

    // Check if there is reactive content
    if (!this.reactiveContent) {
      throw new Error('TUI has no reactive content')
    }

    // Only draw once if the TUI is not a TTY
    if (!this.outStream.isTTY) {
      this.drawReactive(true)
      return
    }

    if (!this.manager.isHooked) {
      // Take control of the terminal
      this.manager.hook()

      // Start the draw loop
      this.isReactive = true
      this.timerId = setInterval(() => {
        this.drawReactive()
      }, this.reactiveContent.getFrameInterval())
    }
  }

  /**
   * Stops any new draws of the current reactive content to the TUI
   *
   * @param clear If true, the last drawn content will be cleared
   */
  stopReactive(clear = false) {
    // If the TUI is not a TTY, draw one last time and return
    if (!this.outStream.isTTY) {
      this.drawReactive(true)
      return
    }

    if (this.manager.isHooked) {
      // Stop the draw loop
      this.isReactive = false
      clearInterval(this.timerId)

      // Draw one last time to ensure the final state is shown
      this.drawReactive(true)

      // Clear the last drawn content if requested
      if (clear) {
        this.manager.erase(this.manager.lastLength)
      }

      // Give up control of the terminal
      this.manager.unhook()
    }
  }

  /**
   * Renders the current reactive content and draws it to the TUI
   *
   * @param force Force a draw even if the TUI is not reactive
   */
  private drawReactive(force = false) {
    if (this.isReactive || force) {
      const wasHooked = this.manager.isHooked
      if (force && !wasHooked) {
        this.manager.hook()
      }
      const content = this.reactiveContent?.renderToString()
      if (content) {
        this.manager.update(content.split('\n'))
      }
      if (force && !wasHooked) {
        this.manager.unhook()
      }
    }
  }

  /**
   * Gets the current reactive TUI content if there is one
   *
   * @returns The current reactive content or undefined if there isn't one
   */
  getCurrentReactive(): ReactiveTUIContent | undefined {
    return this.reactiveContent
  }

  /**
   * Writes a string to the TUI output stream
   *
   * @param text The string to write out
   */
  drawText(text: string) {
    this.outStream.write(`${text}\n`)
  }

  // TODO: Consider a custom prompting implementation for full control of look/feel/functionality etc...
  /**
   * A wrapper around enquirer.prompt that disables the reactive TUI and prompts
   *
   * @param questions A question or array of questions to prompt the user with
   *
   * @returns The prompt result
   */
  async prompt<T = object>(
    questions: Parameters<typeof enquirerPrompt>[0],
  ): Promise<T> {
    const wasReactive = this.isReactive
    if (wasReactive) {
      this.stopReactive()
    }
    const result = await enquirerPrompt<T>(questions)
    if (wasReactive) {
      this.startReactive()
    }
    return result
  }

  /**
   * Display an error message in a box
   *
   * @param title Error box title
   * @param message Error message
   */
  displayError(title: string, message: string) {
    this.drawText(
      boxen(message, {
        padding: 1,
        borderColor: 'red',
        title: `⚠ Error: ${title}`,
        titleAlignment: 'left',
      }),
    )
  }

  /**
   * Display a warning message in a box
   *
   * @param title Error box title
   * @param message Error message
   */
  displayWarning(title: string, message: string) {
    this.drawText(
      boxen(message, {
        padding: 1,
        borderColor: 'yellow',
        title: `⚠ Warning: ${title}`,
        titleAlignment: 'left',
      }),
    )
  }
}

/**
 * Configuration for the TUI
 *
 * Accepts an out and err stream which the TUI will write to.
 */
export interface RedwoodTUIConfig {
  out?: NodeJS.WriteStream
  err?: NodeJS.WriteStream
}