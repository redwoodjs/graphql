#!/usr/bin/env node

import path from 'path'

import { trace, SpanStatusCode } from '@opentelemetry/api'
import fs from 'fs-extra'
import { hideBin, Parser } from 'yargs/helpers'
import yargs from 'yargs/yargs'

import { loadEnvFiles, recordTelemetryAttributes } from '@redwoodjs/cli-helpers'
import { telemetryMiddleware } from '@redwoodjs/telemetry'

import * as buildCommand from './commands/build'
import * as checkCommand from './commands/check'
import * as consoleCommand from './commands/console'
import * as deployCommand from './commands/deploy'
import * as destroyCommand from './commands/destroy'
import * as devCommand from './commands/dev'
import * as execCommand from './commands/exec'
import * as experimentalCommand from './commands/experimental'
import * as generateCommand from './commands/generate'
import * as infoCommand from './commands/info'
import * as jobsCommand from './commands/jobs'
import * as lintCommand from './commands/lint'
import * as prerenderCommand from './commands/prerender'
import * as prismaCommand from './commands/prisma'
import * as recordCommand from './commands/record'
import * as serveCommand from './commands/serve'
import * as setupCommand from './commands/setup'
import * as studioCommand from './commands/studio'
import * as testCommand from './commands/test'
import * as tstojsCommand from './commands/ts-to-js'
import * as typeCheckCommand from './commands/type-check'
import * as upgradeCommand from './commands/upgrade'
import { findUp } from './lib'
import { exitWithError } from './lib/exit'
import * as updateCheck from './lib/updateCheck'
import { loadPlugins } from './plugin'
import { startTelemetry, shutdownTelemetry } from './telemetry/index'

// # Setting the CWD
//
// The current working directory can be set via:
//
// 1. The `--cwd` option
// 2. The `RWJS_CWD` env-var
// 3. By traversing directories upwards for the first `redwood.toml`
//
// ## Examples
//
// ```
// yarn rw info --cwd /path/to/project
// RWJS_CWD=/path/to/project yarn rw info
//
// # In this case, `--cwd` wins out over `RWJS_CWD`
// RWJS_CWD=/path/to/project yarn rw info --cwd /path/to/other/project
//
// # Here we traverses upwards for a redwood.toml.
// cd api
// yarn rw info
// ```

let { cwd, telemetry, help, version } = Parser(hideBin(process.argv), {
  // Telemetry is enabled by default, but can be disabled in two ways
  // - by passing a `--telemetry false` option
  // - by setting a `REDWOOD_DISABLE_TELEMETRY` env var
  boolean: ['telemetry'],
  default: {
    telemetry:
      process.env.REDWOOD_DISABLE_TELEMETRY === undefined ||
      process.env.REDWOOD_DISABLE_TELEMETRY === '',
  },
})
cwd ??= process.env.RWJS_CWD

try {
  if (cwd) {
    // `cwd` was set by the `--cwd` option or the `RWJS_CWD` env var. In this case,
    // we don't want to find up for a `redwood.toml` file. The `redwood.toml` should just be in that directory.
    if (!fs.existsSync(path.join(cwd, 'redwood.toml'))) {
      throw new Error(`Couldn't find a "redwood.toml" file in ${cwd}`)
    }
  } else {
    // `cwd` wasn't set. Odds are they're in a Redwood project,
    // but they could be in ./api or ./web, so we have to find up to be sure.

    const redwoodTOMLPath = findUp('redwood.toml')

    if (!redwoodTOMLPath) {
      throw new Error(
        `Couldn't find up a "redwood.toml" file from ${process.cwd()}`,
      )
    }

    cwd = path.dirname(redwoodTOMLPath)
  }
} catch (error) {
  console.error(error.message)
  process.exit(1)
}

process.env.RWJS_CWD = cwd

// Load .env.* files.
//
// This should be done as early as possible, and the earliest we can do it is after setting `cwd`.
loadEnvFiles()

async function main() {
  // Start telemetry if it hasn't been disabled
  if (telemetry) {
    startTelemetry()
  }

  // Execute CLI within a span, this will be the root span
  const tracer = trace.getTracer('redwoodjs')
  await tracer.startActiveSpan('cli', async (span) => {
    // Ensure telemetry ends after a maximum of 5 minutes
    const telemetryTimeoutTimer = setTimeout(() => {
      shutdownTelemetry()
    }, 5 * 60_000)

    // Record if --version or --help was given because we will never hit a handler which could specify the command
    if (version) {
      recordTelemetryAttributes({ command: '--version' })
    }
    if (help) {
      recordTelemetryAttributes({ command: '--help' })
    }

    // FIXME: There's currently a BIG RED BOX on exiting feServer
    // Is yargs or the RW cli not passing SigInt on to the child process?
    try {
      // Run the command via yargs
      await runYargs()
    } catch (error) {
      exitWithError(error)
    }

    // Span housekeeping
    if (span?.isRecording()) {
      span?.setStatus({ code: SpanStatusCode.OK })
      span?.end()
    }

    // Clear the timeout timer since we haven't timed out
    clearTimeout(telemetryTimeoutTimer)
  })

  // Shutdown telemetry, ensures data is sent before the process exits
  if (telemetry) {
    shutdownTelemetry()
  }
}

async function runYargs() {
  // # Build the CLI yargs instance
  const yarg = yargs(hideBin(process.argv))
    // Config
    .scriptName('rw')
    .middleware(
      [
        // We've already handled `cwd` above, but it may still be in `argv`.
        // We don't need it anymore so let's get rid of it.
        // Likewise for `telemetry`.
        (argv) => {
          delete argv.cwd
          delete argv.addEnvFiles
          delete argv['load-env-files']
          delete argv.telemetry
        },
        telemetry && telemetryMiddleware,
        updateCheck.isEnabled() && updateCheck.updateCheckMiddleware,
      ].filter(Boolean),
    )
    .option('cwd', {
      describe: 'Working directory to use (where `redwood.toml` is located)',
    })
    .option('load-env-files', {
      describe:
        'Load additional .env files. Values defined in files specified later override earlier ones.',
      array: true,
    })
    .example(
      'yarn rw exec migrateUsers --load-env-files stripe nakama',
      "Run a script, also loading env vars from '.env.stripe' and '.env.nakama'",
    )
    .option('telemetry', {
      describe: 'Whether to send anonymous usage telemetry to RedwoodJS',
      boolean: true,
      // hidden: true,
    })
    .example(
      'yarn rw g page home /',
      "Create a page component named 'Home' at path '/'",
    )
    .demandCommand()
    .strict()
    .exitProcess(false)
    .alias('h', 'help')

    // Commands (Built in or pre-plugin support)
    .command(buildCommand)
    .command(checkCommand)
    .command(consoleCommand)
    .command(deployCommand)
    .command(destroyCommand)
    .command(devCommand)
    .command(execCommand)
    .command(experimentalCommand)
    .command(generateCommand)
    .command(infoCommand)
    .command(jobsCommand)
    .command(lintCommand)
    .command(prerenderCommand)
    .command(prismaCommand)
    .command(recordCommand)
    .command(serveCommand)
    .command(setupCommand)
    .command(studioCommand)
    .command(testCommand)
    .command(tstojsCommand)
    .command(typeCheckCommand)
    .command(upgradeCommand)

  // Load any CLI plugins
  await loadPlugins(yarg)

  // We explicitly set the version here so that it's always available
  const pkgJson = require('../package.json')
  yarg.version(pkgJson['version'])

  // Run
  await yarg.parse(process.argv.slice(2), {}, (err, _argv, output) => {
    // Configuring yargs with `strict` makes it error on unknown args;
    // here we're signaling that with an exit code.
    if (err) {
      process.exitCode = 1
    }

    // Show the output that yargs was going to if there was no callback provided
    if (output) {
      if (err) {
        console.error(output)
      } else {
        console.log(output)
      }
    }
  })
}

main()
