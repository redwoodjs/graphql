/* eslint-env node, vitest */

// Disable telemetry within framework tests
process.env.REDWOOD_DISABLE_TELEMETRY = 1

import fs from 'fs'
import path from 'path'

import { expect } from 'vitest'

import { formatCode } from './src/testUtils'

globalThis.matchInlineTransformSnapshot = (
  await import('./src/testUtils/matchInlineTransformSnapshot')
).matchInlineTransformSnapshot
globalThis.matchTransformSnapshot = (
  await import('./src/testUtils/matchTransformSnapshot')
).matchTransformSnapshot
globalThis.matchFolderTransform = (
  await import('./src/testUtils/matchFolderTransform')
).matchFolderTransform

// Custom matcher for checking fixtures using paths
// e.g. expect(transformedPath).toMatchFileContents(expectedPath)
// Mainly so we throw more helpful errors
expect.extend({
  async toMatchFileContents(
    receivedPath,
    expectedPath,
    { removeWhitespace } = { removeWhitespace: false },
  ) {
    let pass = true
    let message = ''
    try {
      let actualOutput = fs.readFileSync(receivedPath, 'utf-8')
      let expectedOutput = fs.readFileSync(expectedPath, 'utf-8')

      if (removeWhitespace) {
        actualOutput = actualOutput.replace(/\s/g, '')
        expectedOutput = expectedOutput.replace(/\s/g, '')
      }

      expect(await formatCode(actualOutput)).toEqual(
        await formatCode(expectedOutput),
      )
    } catch (e) {
      const relativePath = path.relative(
        path.join(__dirname, 'src/commands/setup'),
        expectedPath,
      )
      pass = false
      message = `${e}\nFile contents do not match for fixture at: \n ${relativePath}`
    }

    return {
      pass,
      message: () => message,
      expected: expectedPath,
      received: receivedPath,
    }
  },
})
