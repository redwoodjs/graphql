import fs from 'fs'
import path from 'path'

import { expect } from 'vitest'

// Custom matcher for checking fixtures using paths
// e.g. expect(transformedPath).toMatchFileContents(expectedPath)
// Mainly so we throw more helpful errors
expect.extend({
  toMatchFileContents(
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

      expect(actualOutput).toEqual(expectedOutput)
    } catch (e) {
      const relativePath = path.relative(
        path.join(__dirname, 'src/codemods'),
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
