import fs from 'fs'
import os from 'os'
import path from 'path'

import { fetch } from '@whatwg-node/fetch'
import ci from 'ci-info'
import envinfo from 'envinfo'
import system from 'systeminformation'
import { v4 as uuidv4 } from 'uuid'

import { getRawConfig } from '@redwoodjs/project-config'
import type { RWRoute } from '@redwoodjs/structure/dist/model/RWRoute'

// circular dependency when trying to import @redwoodjs/structure so lets do it
// the old fashioned way
const { DefaultHost } = require('@redwoodjs/structure/dist/hosts')
const { RWProject } = require('@redwoodjs/structure/dist/model/RWProject')

interface SensitiveArgPositions {
  exec: {
    positions: number[]
    options?: never
    redactWith: string[]
    allowOnly: string[]
  }
  g: {
    positions: number[]
    options?: never
    redactWith: string[]
    allowOnly?: string[]
  }
  generate: {
    positions: number[]
    options?: never
    redactWith: string[]
    allowOnly?: string[]
  }
  prisma: {
    positions?: never
    options: string[]
    redactWith: string[]
    allowOnly?: string[]
  }
  lint: {
    positions?: number[]
    options?: never
    redactWith: string[]
    allowOnly: string[]
  }
}

// Tracks any commands that could contain sensitive info and their position in
// the argv array, as well as the text to replace them with
const SENSITIVE_ARG_POSITIONS: SensitiveArgPositions = {
  exec: {
    positions: [1],
    redactWith: ['[script]'],
    allowOnly: ['exec'],
  },
  g: {
    positions: [2, 3],
    redactWith: ['[name]', '[path]'],
  },
  generate: {
    positions: [2, 3],
    redactWith: ['[name]', '[path]'],
  },
  prisma: {
    options: ['--name'],
    redactWith: ['[name]'],
  },
  lint: {
    allowOnly: ['lint', '--fix'],
    redactWith: ['[path]'],
  },
}

interface Args {
  redwoodVersion?: string
  command?: string
}

/** Gets diagnostic info and sanitizes by removing references to paths */
const getInfo = async (presets: Args = {}) => {
  const info = JSON.parse(
    await envinfo.run(
      {
        System: ['OS', 'Shell'],
        Binaries: ['Node', 'Yarn', 'npm'],
        npmPackages: '@redwoodjs/*',
        IDEs: ['VSCode'],
      },
      { json: true },
    ),
  )

  // get shell name instead of path
  const shell = info.System?.Shell // Windows doesn't always provide shell info, I guess
  if (shell?.path?.match('/')) {
    info.System.Shell.name = info.System.Shell.path.split('/').pop()
  } else if (shell?.path.match('\\')) {
    info.System.Shell.name = info.System.Shell.path.split('\\').pop()
  }

  const cpu = await system.cpu()
  const mem = await system.mem()

  // Returns a list of all enabled experiments
  // This detects all top level [experimental.X] and returns all X's, ignoring all Y's for any [experimental.X.Y]
  const experiments = Object.keys(getRawConfig()['experimental'] || {})

  return {
    os: info.System?.OS?.split(' ')[0],
    osVersion: info.System?.OS?.split(' ')[1],
    shell: info.System?.Shell?.name,
    nodeVersion: info.Binaries?.Node?.version,
    yarnVersion: info.Binaries?.Yarn?.version,
    npmVersion: info.Binaries?.npm?.version,
    vsCodeVersion: info.IDEs?.VSCode?.version,
    redwoodVersion:
      presets.redwoodVersion || info.npmPackages['@redwoodjs/core']?.installed,
    system: `${cpu.physicalCores}.${Math.round(mem.total / 1073741824)}`,
    webBundler: 'vite', // Hardcoded as this is now the only supported bundler
    experiments,
  }
}

// removes potentially sensitive information from an array of argv strings
export const sanitizeArgv = (
  argv: [string, string, keyof SensitiveArgPositions, ...string[]],
) => {
  const name = argv[2]
  const sensitiveCommand = SENSITIVE_ARG_POSITIONS[name]
  const args = argv.slice(2)

  if (sensitiveCommand) {
    // redact positional arguments
    if (sensitiveCommand.positions) {
      sensitiveCommand.positions.forEach((pos: number, index: number) => {
        // only redact if the text in the given position is not a --flag
        if (args[pos] && !args[pos].includes('--')) {
          args[pos] = sensitiveCommand.redactWith[index]
        }
      })
    }

    // redact --option arguments
    if (sensitiveCommand.options) {
      sensitiveCommand.options.forEach((option: string, index: number) => {
        const argIndex = args.indexOf(option)
        if (argIndex !== -1) {
          args[argIndex + 1] = sensitiveCommand.redactWith[index]
        }
      })
    }

    // allow only clause
    if (sensitiveCommand.allowOnly) {
      args.forEach((arg: string, index: number) => {
        if (
          !sensitiveCommand.allowOnly?.includes(arg) &&
          !sensitiveCommand.redactWith.includes(arg)
        ) {
          args[index] = sensitiveCommand.redactWith[0]
        }
      })
    }
  }

  return args.join(' ')
}

const buildPayload = async () => {
  let payload: Record<string, unknown> = {}
  let project

  const processArgv = [...process.argv]

  // On windows process.argv may not return an array of strings.
  // It will look something like [a,b,c] rather than ["a","b","c"] so we must stringify them before parsing as JSON
  // "os.type()" returns 'Windows_NT' on Windows. See https://nodejs.org/docs/latest-v12.x/api/os.html#os_os_type.
  if (os.type() === 'Windows_NT') {
    const argvIndex = processArgv.findIndex((arg) => arg === '--argv') + 1
    let argvFormatted = argvIndex !== 0 ? processArgv[argvIndex] : null
    if (argvFormatted) {
      argvFormatted =
        '[' +
        argvFormatted
          .substring(1, argvFormatted.length - 1)
          .split(',')
          .map((arg) => {
            return arg.startsWith('"') || arg.startsWith("'") ? arg : `"${arg}"`
          })
          .join(',') +
        ']'
      processArgv[argvIndex] = argvFormatted
    }
  }

  const argv = require('yargs/yargs')(processArgv.slice(2)).parse()
  const rootDir = argv.root
  const command = argv.argv ? sanitizeArgv(JSON.parse(argv.argv)) : ''
  payload = {
    type: argv.type || 'command',
    command,
    duration: argv.duration ? parseInt(argv.duration) : null,
    uid: uniqueId(rootDir) || null,
    ci: ci.isCI,
    redwoodCi: !!process.env.REDWOOD_CI,
    NODE_ENV: process.env.NODE_ENV || null,
    ...(await getInfo({ redwoodVersion: argv.rwVersion, command })),
  }

  if (argv.error) {
    payload.type = 'error'
    payload.error = argv.error
      .split('\n')[0]
      .replace(/(\/[@\-\.\w]+)/g, '[path]')
  }

  // if a root directory was specified, use that to look up framework stats
  // with the `structure` package
  if (rootDir) {
    project = new RWProject({
      projectRoot: rootDir,
      host: new DefaultHost(),
    })
  }

  const routes: RWRoute[] = project.getRouter().routes
  const prerenderedRoutes = routes.filter((route) => route.hasPrerender)

  // add in app stats
  payload = {
    ...payload,
    complexity:
      `${routes.length}.${prerenderedRoutes.length}.` +
      `${project.services.length}.${project.cells.length}.` +
      `${project.pages.length}`,
    sides: project.sides.join(','),
  }

  return payload
}

// returns the UUID for this device. caches the UUID for 24 hours
const uniqueId = (rootDir: string | null) => {
  const telemetryCachePath = path.join(
    rootDir || '/tmp',
    '.redwood',
    'telemetry.txt',
  )
  const now = Date.now()
  const expires = now - 24 * 60 * 60 * 1000 // one day
  let uuid

  if (
    !fs.existsSync(telemetryCachePath) ||
    fs.statSync(telemetryCachePath).mtimeMs < expires
  ) {
    uuid = uuidv4()
    try {
      // Create `.redwood` directory if it does not exist
      if (!fs.existsSync(path.dirname(telemetryCachePath))) {
        fs.mkdirSync(path.dirname(telemetryCachePath), { recursive: true })
      }
      fs.writeFileSync(telemetryCachePath, uuid)
    } catch {
      console.error('\nCould not create telemetry.txt file\n')
    }
  } else {
    uuid = fs.readFileSync(telemetryCachePath).toString()
  }

  return uuid
}

// actually call the API with telemetry data
export const sendTelemetry = async () => {
  const telemetryUrl =
    process.env.REDWOOD_REDIRECT_TELEMETRY ||
    'https://telemetry.redwoodjs.com/api/v1/telemetry'

  try {
    const payload = await buildPayload()

    if (process.env.REDWOOD_VERBOSE_TELEMETRY) {
      console.info('Redwood Telemetry Payload', payload)
    }

    const response = await fetch(telemetryUrl, {
      method: 'post',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' },
    })

    if (process.env.REDWOOD_VERBOSE_TELEMETRY) {
      console.info('Redwood Telemetry Response:', response)
    }

    // Normally we would report on any non-error response here (like a 500)
    // but since the process is spawned and stdout/stderr is ignored, it can
    // never be seen by the user, so ignore.
    if (process.env.REDWOOD_VERBOSE_TELEMETRY && response.status !== 200) {
      console.error('Error from telemetry insert:', await response.text())
    }
  } catch (e) {
    // service interruption: network down or telemetry API not responding
    // don't let telemetry errors bubble up to user, just do nothing.
    if (process.env.REDWOOD_VERBOSE_TELEMETRY) {
      console.error('Uncaught error in telemetry:', e)
    }
  }
}
