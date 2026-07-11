import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import semver from 'semver'
import which from 'which'

import type { Config } from './config.js'

import { ExitCodeError } from './error.js'

export function checkNodeVersion(config: Config) {
  if (config.verbose) {
    console.log('Running `node --version`')
  }

  const result = spawnSync('node', ['--version'])

  if (result.error) {
    console.error('❌ Could not run `node --version`')

    throw new ExitCodeError(1, result.error.message)
  }

  const version = result.stdout.toString()

  if (config.verbose) {
    console.log('Node version:', version)
  }

  // https://github.com/redwoodjs/redwood/issues/10492#issuecomment-2076063552
  // The comment above and the one after explains why we check specifically
  // for >= 20.10.0
  if (!semver.satisfies(version, '>=20.10')) {
    console.error('❌Your Node.js version must be >=20.10.0')
    console.error('Please install or switch to a newer version of Node')
    console.error(
      'We recommend using a Node version manager like `fnm`, `nvm` or `n`',
    )
    throw new ExitCodeError(1, 'Node version too old')
  }

  console.log('✅ Node version requirements met')
}

export function checkYarnInstallation(config: Config) {
  const allYarns = which.sync('yarn', { all: true, nothrow: true })

  if (!allYarns) {
    console.log('')
    console.log('Could not find `yarn`')
    console.log('Please enable yarn by running `corepack enable`')
    console.log(
      'and then upgrade by running `corepack install --global yarn@latest',
    )
    throw new ExitCodeError(1, 'Yarn not found')
  }

  if (config.verbose) {
    console.log('yarn path(s):', allYarns)
  }

  const yarnPath = fs.realpathSync(allYarns[0])

  if (config.verbose) {
    console.log('yarn canonical path:', yarnPath)
  }

  if (yarnPath.includes('/corepack/') || yarnPath.includes('\\corepack\\')) {
    // The first found `yarn` seems to be installed by corepack, so all is good
    console.log('✅ Yarn requirements met')
    return
  }

  // When running with `tsx` yarn sometimes(?) is run from a temporary
  // directory, so we fall back to reading the source code
  const yarnSrc = fs.readFileSync(yarnPath, 'utf8')

  if (config.verbose) {
    console.log('yarn source', yarnSrc)
  }

  if (yarnSrc.includes('corepack')) {
    console.log('✅ Yarn requirements met')
    return
  }

  // Skipping the first one, as we've already checked it further up
  for (const yarn of allYarns.slice(1)) {
    const yarnPath = fs.realpathSync(yarn)

    if (config.verbose) {
      console.log('Found yarn:', yarnPath)
    }

    const yarnSrc = fs.readFileSync(yarnPath, 'utf8')

    if (config.verbose) {
      console.log('yarn source', yarnSrc)
    }

    if (yarnSrc.includes('corepack')) {
      console.log('')
      console.log(
        'You have more than one active yarn installation. One is installed ' +
          "by corepack,\nbut it's not the first one in $PATH.",
      )
      console.log("Perhaps you've manually installed it using Homebrew or npm.")
      console.log(
        'Please completely uninstall yarn and then enable it using corepack',
      )
      console.log('`corepack enable`')
      console.log(
        '(yarn is already shipped with Node, you just need to enable it)',
      )
      throw new ExitCodeError(1, 'corepack yarn is not first in $PATH')
    }
  }

  console.log('')
  console.log("Found yarn, but it's not enabled by corepack.")
  console.log('Redwood works best with yarn enabled via corepack.')
  console.log(
    'Please completely uninstall yarn and then enable it using corepack',
  )
  console.log('`corepack enable`')
  throw new ExitCodeError(1, 'yarn needs to be enabled by corepack')
}
