import { spawn } from 'child_process'
import os from 'os'
import path from 'path'

import fs from 'fs-extra'

import { getPaths } from '@redwoodjs/project-config'

/**
 * Spawn a background process with the stdout/stderr redirected to log files within the `.redwood` directory.
 * Stdin will not be available to the process as it will be set to the 'ignore' value.
 *
 * @param {string} name A name for this background process, will be used to name the log files
 * @param {string} cmd Command to pass to the `spawn` function
 * @param {string[]} args Arguements to pass to the `spawn` function
 */
export function spawnBackgroundProcess(name, cmd, args) {
  const logDirectory = path.join(getPaths().generated.base, 'logs')
  fs.ensureDirSync(logDirectory)

  const safeName = name.replace(/[^a-z0-9]/gi, '_').toLowerCase()

  const logHeader = [
    `Starting log:`,
    ` - Time: ${new Date().toISOString()}`,
    ` - Name: ${name} (${safeName})`,
    ` - Command: ${cmd}`,
    ` - Arguments: ${args.join(' ')}`,
    '',
    '',
  ].join('\n')

  const stdout = fs.openSync(
    path.join(logDirectory, `${safeName}.out.log`),
    'w',
  )
  fs.writeSync(stdout, logHeader)

  const stderr = fs.openSync(
    path.join(logDirectory, `${safeName}.err.log`),
    'w',
  )
  fs.writeSync(stderr, logHeader)

  // We must account for some platform specific behaviour
  const spawnOptions =
    os.type() === 'Windows_NT'
      ? {
          // The following options run the process in the background without a console window, even though they don't look like they would.
          // See https://github.com/nodejs/node/issues/21825#issuecomment-503766781 for information
          detached: false,
          windowsHide: false,
          shell: true,
          stdio: ['ignore', stdout, stderr],
        }
      : {
          detached: true,
          stdio: ['ignore', stdout, stderr],
        }

  // Spawn and detach the process
  const child = spawn(cmd, args, spawnOptions)
  child.unref()
}
