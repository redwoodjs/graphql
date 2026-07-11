import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'

import tempy from 'tempy'
import { expect } from 'vitest'

import runTransform from '../testLib/runTransform'

import { formatCode } from './index'

const require = createRequire(import.meta.url)

export interface MatchTransformSnapshotFunction {
  (
    transformName: string,
    fixtureName?: string,
    parser?: 'ts' | 'tsx',
  ): Promise<void>
}

export const matchTransformSnapshot: MatchTransformSnapshotFunction = async (
  transformName,
  fixtureName,
  parser,
) => {
  const tempFilePath = tempy.file()

  // Looks up the path of the caller
  const testPath = expect.getState().testPath

  if (!testPath) {
    throw new Error('Could not find test path')
  }

  let fixturePath

  const maybeFixturePath = path.join(
    testPath,
    '../../__testfixtures__',
    `${fixtureName}.input`,
  )

  for (const extension of ['ts', 'tsx', 'js', 'jsx']) {
    try {
      fixturePath = require.resolve(`${maybeFixturePath}.${extension}`)
    } catch {
      continue
    }
  }

  if (!fixturePath) {
    throw new Error(
      `Could not find fixture for ${fixtureName} in ${maybeFixturePath}`,
    )
  }

  const transformPath = require.resolve(
    path.join(testPath, '../../', `${transformName}.ts`),
  )

  // Step 1: Copy fixture to temp file
  fs.copyFileSync(fixturePath, tempFilePath, fs.constants.COPYFILE_FICLONE)

  // Step 2: Run transform against temp file
  await runTransform({
    transformPath,
    targetPaths: [tempFilePath],
    parser,
    options: {
      verbose: 1,
      print: true,
    },
  })

  // Step 3: Read modified file and snapshot
  const transformedContent = fs.readFileSync(tempFilePath, 'utf-8')

  const expectedOutput = fs.readFileSync(
    fixturePath.replace('.input.', '.output.'),
    'utf-8',
  )

  expect(await formatCode(transformedContent)).toEqual(
    await formatCode(expectedOutput),
  )
}
