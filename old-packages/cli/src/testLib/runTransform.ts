/**
 * A simple wrapper around the jscodeshift.
 *
 * @see jscodeshift CLI's usage {@link https://github.com/facebook/jscodeshift#usage-cli}
 * @see prisma/codemods {@link https://github.com/prisma/codemods/blob/main/utils/runner.ts}
 * @see react-codemod {@link https://github.com/reactjs/react-codemod/blob/master/bin/cli.js}
 */
import * as jscodeshift from 'jscodeshift/src/Runner'

const defaultJscodeshiftOpts = {
  verbose: 0,
  dry: false,
  print: false,
  babel: true,
  ignorePattern: '**/node_modules/**',
  ignoreConfig: [],
  runInBand: false,
  silent: false,
  parser: 'babel',
  parserConfig: {},
  failOnError: false,
  stdin: false,
}

export interface RunTransform {
  /**
   * Path to the transform.
   */
  transformPath: string
  /**
   * Path(s) to the file(s) to transform. Can also be a directory.
   */
  targetPaths: string[]
  parser?: 'babel' | 'ts' | 'tsx'
  /**
   * jscodeshift options and transform options.
   */
  options?: Partial<Record<keyof typeof defaultJscodeshiftOpts, any>>
}

export const runTransform = async ({
  transformPath,
  targetPaths,
  parser = 'tsx',
  options = {},
}: RunTransform) => {
  try {
    // We have to do this here for the tests, because jscodeshift.run actually spawns
    // a different process. If we use getPaths() in the transform, it would not find redwood.toml
    if (process.env.NODE_ENV === 'test' && process.env.RWJS_CWD) {
      process.chdir(process.env.RWJS_CWD)
    }

    await jscodeshift.run(transformPath, targetPaths, {
      ...defaultJscodeshiftOpts,
      parser,
      babel: process.env.NODE_ENV === 'test',
      ...options, // Putting options here lets them override all the defaults.
    })
  } catch (e: any) {
    console.error('Transform Error', e.message)

    throw new Error('Failed to invoke transform')
  }
}

export default runTransform
