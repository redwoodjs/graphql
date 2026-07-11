import { join } from 'path'

import { outputFileSync } from 'fs-extra'
import proxyquire from 'proxyquire'

import { spawnCancellable } from '../x/child_process'

import type { RedwoodCommandString } from './RedwoodCommandString'

export type FileSet = { [filePath: string]: string | null }

interface Opts {
  /**
   * redwood project root (filepath)
   */
  cwd: string
  /**
   * Command to execute
   */
  cmd: RedwoodCommandString
  /**
   * Files to override
   */
  fileOverrides?: FileSet
  /**
   * directory to store the temporary generated JS script
   */
  tmpdir?: string
}

export async function redwood_gen_dry_run(
  opts: Opts,
): Promise<{ stdout: string; files: FileSet }> {
  const { cwd, cmd, fileOverrides, tmpdir } = opts
  if (!cmd.isComplete) {
    throw new Error(
      'cannot pass an interactive command straight to the redwood-cli. You must run it through the command_builder first',
    )
  }
  // eslint-disable-next-line
  const x = [proxyquire].length // we need to make sure this module is required. it will be used in a script we will generate dynamically
  const tempDir = tmpdir ?? join(cwd, '.tmp')
  const jsfile = join(tempDir, 'rwcli.js')
  const requireStatement = 'proxyquire'
  // if (extensionPath) {
  //   requireStatement = relative(
  //     dirname(jsfile),
  //     extensionPath + "/node_modules/proxyquire"
  //   );
  // }
  outputFileSync(jsfile, buildJS(fileOverrides, requireStatement))
  const cmdargs = 'node ' + jsfile + ' ' + cmd.processed
  const [cmd2, ...args] = cmdargs.split(' ')
  // TODO: use execa?
  const { stdout: out, stderr } = await spawnCancellable(cmd2, args, {
    cwd,
  })
  if (stderr) {
    throw new Error(stderr)
  }
  //const out = execSync(cmdargs, { cwd: projectRoot })
  const [stdout, jsondata] = out.toString().split(separator)
  return { stdout, files: JSON.parse(jsondata) }
}

const separator = '---------===----===--------'

function buildJS(
  fileOverrides: FileSet = {},
  proxyquireRequireStatement = 'proxyquire',
) {
  let js = `
  const proxyquire = require("proxyquire")
  const fs = require('fs')
  const path = require('path')
  const files = {}
  const fileOverrides = { FILE: "OVERRIDES" }
  const FILE_SCHEME = 'file://'

  function URL_file(f) {
    if (f.startsWith(FILE_SCHEME))
      f = f.substr(FILE_SCHEME.length)
    return new URL(FILE_SCHEME + path.normalize(f)).href
  }

  proxyquire('@redwoodjs/cli/dist', {
    fs: {
      mkdir() {},
      mkdirSync(...args) {},
      writeFile(a, b) {
        files[URL_file(a)] = b
      },
      writeFileSync(a, b) {
        files[URL_file(a)] = b
      },
      readFileSync(...args) {
        const f = URL_file(args[0])
        if (fileOverrides[f]) return fileOverrides[f]
        return fs.readFileSync.apply(fs, args)
      },
      '@global': true,
    },
  })

  process.on('exit', () => {
    console.log("__SEPARATOR__")
    console.log(JSON.stringify(files, null, 2))
  })
  `
  // replace some placeholders in the template
  js = js.replace(`{ FILE: "OVERRIDES" }`, JSON.stringify(fileOverrides))
  js = js.replace(`"__SEPARATOR__"`, JSON.stringify(separator))
  js = js.replace(
    `require("proxyquire")`,
    `require("${proxyquireRequireStatement}")`,
  )
  return js
}
