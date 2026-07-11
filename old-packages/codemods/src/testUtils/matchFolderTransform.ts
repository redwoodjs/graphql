import path from 'path'

import fg from 'fast-glob'
import fse from 'fs-extra'
import { expect } from 'vitest'

import runTransform from '../lib/runTransform'

import { createProjectMock } from './index'

type Options = {
  removeWhitespace?: boolean
  targetPathsGlob?: string
  /**
   * Use this option, when you want to run a codemod that uses jscodeshift
   * as well as modifies file names. e.g. convertJsToJsx
   */
  useJsCodeshift?: boolean
}

type MatchFolderTransformFunction = (
  transformFunctionOrName: (() => any) | string,
  fixtureName?: string,
  options?: Options,
) => Promise<void>

export const matchFolderTransform: MatchFolderTransformFunction = async (
  transformFunctionOrName,
  fixtureName,
  {
    removeWhitespace = false,
    targetPathsGlob = '**/*',
    useJsCodeshift = false,
  } = {},
) => {
  const tempDir = createProjectMock()

  // Override paths used in getPaths() utility func
  process.env.RWJS_CWD = tempDir

  // Looks up the path of the caller
  const testPath = expect.getState().testPath

  if (!testPath) {
    throw new Error('Could not find test path')
  }

  const fixtureFolder = path.join(
    testPath,
    '../../__testfixtures__',
    fixtureName || '',
  )

  const fixtureInputDir = path.join(fixtureFolder, 'input')
  const fixtureOutputDir = path.join(fixtureFolder, 'output')

  // Step 1: Copy files recursively from fixture folder to temp
  fse.copySync(fixtureInputDir, tempDir, {
    overwrite: true,
  })

  const GLOB_CONFIG = {
    absolute: false,
    dot: true,
    ignore: ['redwood.toml', '**/*.DS_Store'], // ignore the fake redwood.toml added for getPaths
  }

  // Step 2: Run transform against temp dir
  if (useJsCodeshift) {
    if (typeof transformFunctionOrName !== 'string') {
      throw new Error(
        'When running matchFolderTransform with useJsCodeshift, transformFunction must be a string (file name of jscodeshift transform)',
      )
    }
    const transformName = transformFunctionOrName
    const transformPath = require.resolve(
      path.join(testPath, '../../', `${transformName}.ts`),
    )

    const targetPaths = fg.sync(targetPathsGlob, {
      ...GLOB_CONFIG,
      cwd: tempDir,
    })

    // So that the transform can use getPaths() utility func
    // This is used inside the runTransform function
    process.env.RWJS_CWD = tempDir

    await runTransform({
      transformPath,
      targetPaths: targetPaths.map((p) => path.join(tempDir, p)),
    })
  } else {
    if (typeof transformFunctionOrName !== 'function') {
      throw new Error(
        'transformFunction must be a function, if useJsCodeshift set to false',
      )
    }
    const transformFunction = transformFunctionOrName
    await transformFunction()
  }

  const transformedPaths = fg.sync(targetPathsGlob, {
    ...GLOB_CONFIG,
    cwd: tempDir,
  })

  const expectedPaths = fg.sync(targetPathsGlob, {
    ...GLOB_CONFIG,
    cwd: fixtureOutputDir,
  })

  // Step 3: Check output paths
  expect(transformedPaths).toEqual(expectedPaths)

  // Step 4: Check contents of each file
  transformedPaths.forEach((transformedFile) => {
    const actualPath = path.join(tempDir, transformedFile)
    const expectedPath = path.join(fixtureOutputDir, transformedFile)

    expect(actualPath).toMatchFileContents(expectedPath, { removeWhitespace })
  })

  delete process.env.RWJS_CWD
}
