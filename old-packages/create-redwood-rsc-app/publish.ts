import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { rimrafSync } from 'rimraf'
import { $ } from 'zx'

async function main() {
  if (process.argv.length !== 4) {
    throw new Error('Usage: publish.ts <patch|minor|major> <otp>')
  }

  const version = process.argv[2]

  if (version !== 'patch' && version !== 'minor' && version !== 'major') {
    console.error(
      'The specified version needs to be one of patch, minor, or major',
    )

    throw new Error('Usage: yarn tsx publish.ts <patch|minor|major> <otp>')
  }

  const otp = process.argv[3]

  if (typeof otp !== 'string' || !/^\d{6}$/.test(otp)) {
    console.error('The OTP needs to be a string of 6 digits')

    throw new Error('Usage: yarn tsx publish.ts <patch|minor|major> <otp>')
  }

  const yarnrcPath = path.join(os.homedir(), '.yarnrc.yml')

  if (!fs.existsSync(yarnrcPath)) {
    throw new Error(
      'You need a .yarn.yml file in your home directory to run this script.',
    )
  }

  const yarnrc = fs.readFileSync(yarnrcPath, 'utf-8')

  if (!/^npmAuthToken:/m.test(yarnrc)) {
    console.error('This script needs an NPM auth token to run.')
    console.error('You set it in your ~/.yarnrc.yml file like this:')
    console.error('npmAuthToken: your-auth-token')
    console.error(
      'Generate a token on your https://www.npmjs.com/ account settings page',
    )

    throw new Error(
      'Could not detect an `npmAuthToken` config option in your ~/.yarnrc.yml file',
    )
  }

  rimrafSync('dist')
  await $`yarn build`
  await $`npm version ${version}`
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'))
  await $`git commit -am "create-redwood-rsc-app v${packageJson.version}"`
  await $`git tag "create-redwood-rsc-app/v${packageJson.version}"`
  await $`yarn npm publish --otp ${otp}`
  await $`git push upstream --follow-tags`
}

main().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})
