import path from 'path'

import fs from 'fs-extra'

import { getPaths } from '@redwoodjs/project-config'

/**
 * Custom exporter which writes spans to a file inside of .redwood/spans
 */
export class CustomFileExporter {
  /**
   * @type string
   * @private
   */
  #storageFileName

  /**
   * @type string
   * @private
   */
  #storageFilePath

  /**
   * @type boolean
   * @private
   */
  #isShutdown = false

  constructor() {
    this.#storageFileName = `${Date.now()}.json`

    // Ensure the path exists
    this.#storageFilePath = path.join(
      getPaths().generated.base,
      'telemetry',
      this.#storageFileName,
    )
    fs.ensureDirSync(path.dirname(this.#storageFilePath))

    // Create the file and open a JSON array
    fs.writeFileSync(this.#storageFilePath, '[')
  }

  /**
   * Called to export sampled {@link ReadableSpan}s.
   * @param spans the list of sampled Spans to be exported.
   */
  export(spans, resultCallback) {
    for (let i = 0; i < spans.length; i++) {
      const span = spans[i]
      delete span['_spanProcessor'] // This is a circular reference and will cause issues with JSON.stringify
      fs.appendFileSync(
        this.#storageFilePath,
        JSON.stringify(span, undefined, 2),
      )
      fs.appendFileSync(this.#storageFilePath, ',')
    }
    resultCallback({ code: 0 })
  }

  /** Stops the exporter. */
  shutdown() {
    // Close the JSON array
    if (!this.#isShutdown) {
      // Remove the trailing comma
      fs.truncateSync(
        this.#storageFilePath,
        fs.statSync(this.#storageFilePath).size - 1,
      )
      fs.appendFileSync(this.#storageFilePath, ']')
      this.#isShutdown = true
    }
  }

  /** Immediately export all spans */
  forceFlush() {
    // Do nothing
  }
}
