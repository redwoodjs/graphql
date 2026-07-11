import { spawnSync } from 'node:child_process'

import type { Config } from './config.js'

export function initialCommit(config: Config) {
  if (config.verbose) {
    console.log('Running `git init .`')
  }
  spawnSync('git', ['init', '.'], { cwd: config.installationDir })

  if (config.verbose) {
    console.log('Running `git add .`')
  }
  spawnSync('git', ['add', '.'], { cwd: config.installationDir })

  if (config.verbose) {
    console.log('Running `git commit`')
  }
  spawnSync('git', ['commit', '-m', 'Initial commit'], {
    cwd: config.installationDir,
  })
}
