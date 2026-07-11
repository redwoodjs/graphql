import fs from 'fs'
import path from 'path'

import tempy from 'tempy'
import { expect } from 'vitest'

import runTransform from '../lib/runTransform'

import { formatCode } from './index'

export const matchInlineTransformSnapshot = async (
  transformName: string,
  fixtureCode: string,
  expectedCode: string,
  parser: 'ts' | 'tsx' | 'babel' = 'tsx',
) => {
  const tempFilePath = tempy.file()

  // Looks up the path of the caller
  const testPath = expect.getState().testPath

  if (!testPath) {
    throw new Error('Could not find test path')
  }

  const transformPath = require.resolve(
    path.join(testPath, '../../', `${transformName}.ts`),
  )

  // Step 1: Write passed in code to a temp file
  fs.writeFileSync(tempFilePath, fixtureCode)

  // Step 2: Run transform against temp file
  await runTransform({
    transformPath,
    targetPaths: [tempFilePath],
    options: {
      verbose: 1,
    },
    parser,
  })

  // Step 3: Read modified file and snapshot
  const transformedContent = fs.readFileSync(tempFilePath, 'utf-8')

  expect(await formatCode(transformedContent)).toEqual(
    await formatCode(expectedCode),
  )
}
