import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

import type { Config } from './config.js'

export function install(config: Config) {
  console.log('🐈 Running `yarn install`')
  console.log('    ⏳ This might take a while...')

  if (config.verbose) {
    console.log()
    console.log('Installation directory contents before installing:')
    fs.readdirSync(config.installationDir, { withFileTypes: true }).forEach(
      (file) => {
        console.log('  ' + file.name + (file.isDirectory() ? '/' : ''))
      },
    )
    console.log()
  }

  // This allows us to run `yarn install` even if the parent directory is
  // another node project (like if you try to set it up in a sub-directory of
  // this project)
  fs.writeFileSync(path.join(config.installationDir, 'yarn.lock'), '')

  const result = spawnSync('yarn', ['install'], {
    cwd: config.installationDir,
    // On Windows `yarn` isn't an executable. It can't be run as a system
    // process. So it needs to be run in a shell process.
    shell: process.platform === 'win32',
  })

  if (config.verbose) {
    console.log('spawnSync result.status', result.status)
    console.log('spawnSync result.stdout', result.stdout.toString())
    console.log('spawnSync result.stderr', result.stderr.toString())
    console.log()
    console.log(
      'yarn.lock file size (in kb)',
      fs.statSync(path.join(config.installationDir, 'yarn.lock')).size / 1024,
    )
    console.log()
  }
}
