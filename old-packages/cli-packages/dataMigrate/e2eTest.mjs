/* eslint-env node */

// This test mostly provides an easy way to run the code in this package on a project.
// We'll see about automating it in CI and making the monolithic CI action lighter.

import assert from 'node:assert/strict'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import chalk from 'chalk'
import execa from 'execa'
import yargs from 'yargs/yargs'

import { commands } from './dist/index.js'

const distPath = fileURLToPath(new URL('./dist', import.meta.url))
const binPath = path.join(distPath, 'bin.js')

const command = `node ${binPath}`

// ─── Constants ───────────────────────────────────────────────────────────────

const expectedBinHelp = `\
data-migrate

Run any outstanding Data Migrations against the database

Options:
      --help                                Show help                  [boolean]
      --version                             Show version number        [boolean]
      --import-db-client-from-dist,         Import the db client from dist
      --db-from-dist                                  [boolean] [default: false]
  -d, --dist-path                           Path to the api dist directory
         [string] [default: "/Users/dom/projects/redwood/test-project/api/dist"]

Also see the Redwood CLI Reference
(​https://redwoodjs.com/docs/cli-commands#datamigrate-up​)`

const expectedBinNoPendingDataMigrations = `\

No pending data migrations run, already up-to-date.
`

const expectedInstallHelp = `\
e2eTest.mjs install

Add the RW_DataMigration model to your schema

Options:
  --help     Show help                                                 [boolean]
  --version  Show version number                                       [boolean]

Also see the Redwood CLI Reference
(​https://redwoodjs.com/docs/cli-commands#datamigrate-install​)`

// ─── Tests ───────────────────────────────────────────────────────────────────

const testProjectPath =
  process.env.REDWOOD_TEST_PROJECT_PATH ?? process.env.PROJECT_PATH

// Handle there being no test project to run against.
if (testProjectPath === undefined) {
  console.error(
    [
      chalk.red('Error: No test project to run against.'),
      "If you haven't generated a test project, do so first via...",
      '',
      '  yarn build:test-project --link <your test project path>',
      '',
      `Then set the ${chalk.magenta(
        'REDWOOD_TEST_PROJECT_PATH',
      )} env var to the path of your test project and run this script again.`,
    ].join('\n'),
  )
  process.exit(1)
}

process.chdir(testProjectPath)

let stdout

// ─── Bin Help ────────────────────────────────────────────────────────────────
console.log('Running bin help test')
stdout = (await execa.command(`${command} --help`)).stdout
assert.equal(stdout, expectedBinHelp)

// ─── Bin No Pending Data Migrations ──────────────────────────────────────────
await execa.command('yarn rw prisma generate')

console.log('Running bin no pending data migrations test')
stdout = (await execa.command(command)).stdout
assert.equal(stdout, expectedBinNoPendingDataMigrations)

// ─── Install Help ────────────────────────────────────────────────────────────
console.log('Running install help test')
const installCommand = commands.find(({ command }) => command === 'install')
const parser = yargs().command(installCommand)

stdout = await new Promise((resolve) => {
  parser.parse(['install', '--help'], (err, argv, stdout) => {
    resolve(stdout)
  })
})

assert.equal(stdout, expectedInstallHelp)

// ─── Install ─────────────────────────────────────────────────────────────────
await parser.parse(['install'])

// check that install worked...

// ─── Bin ─────────────────────────────────────────────────────────────────────
await execa.command('yarn rw prisma migrate dev --name test', {
  stdio: 'inherit',
})

await execa.command('yarn rw g data-migration test', {
  stdio: 'inherit',
})

await execa.command(command)

// check that up worked...
