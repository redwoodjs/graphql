import { argv } from 'process'

import concurrently from 'concurrently'
import fs from 'fs-extra'

import { recordTelemetryAttributes } from '@redwoodjs/cli-helpers'
import { shutdownPort } from '@redwoodjs/internal/dist/dev'
import { getConfig, getConfigPath } from '@redwoodjs/project-config'
import { errorTelemetry } from '@redwoodjs/telemetry'

import { getPaths } from '../lib'
import c from '../lib/colors'
import { exitWithError } from '../lib/exit'
import { generatePrismaClient } from '../lib/generatePrismaClient'
import { getFreePort } from '../lib/ports'
import { serverFileExists } from '../lib/project'

const defaultApiDebugPort = 18911

export const handler = async ({
  side = ['api', 'web'],
  forward = '',
  generate = true,
  apiDebugPort,
}) => {
  recordTelemetryAttributes({
    command: 'dev',
    side: JSON.stringify(side),
    generate,
  })

  const rwjsPaths = getPaths()

  const serverFile = serverFileExists()

  // Starting values of ports from config (redwood.toml)
  let apiPreferredPort = parseInt(getConfig().api.port)
  let webPreferredPort = parseInt(getConfig().web.port)

  // Assume we can have the ports we want
  let apiAvailablePort = apiPreferredPort
  let apiPortChangeNeeded = false
  let webAvailablePort = webPreferredPort
  let webPortChangeNeeded = false

  // Check api port, unless there's a serverFile. If there is a serverFile, we
  // don't know what port will end up being used in the end. It's up to the
  // author of the server file to decide and handle that
  if (side.includes('api') && !serverFile) {
    apiAvailablePort = await getFreePort(apiPreferredPort)
    if (apiAvailablePort === -1) {
      exitWithError(undefined, {
        message: `Could not determine a free port for the api server`,
      })
    }
    apiPortChangeNeeded = apiAvailablePort !== apiPreferredPort
  }

  // Check web port
  if (side.includes('web')) {
    // Extract any ports the user forwarded to the dev server and prefer that instead
    const forwardedPortMatches = [
      ...forward.matchAll(/\-\-port(\=|\s)(?<port>[^\s]*)/g),
    ]
    if (forwardedPortMatches.length) {
      webPreferredPort = parseInt(forwardedPortMatches.pop().groups.port)
    }
    webAvailablePort = await getFreePort(webPreferredPort, [
      apiPreferredPort,
      apiAvailablePort,
    ])
    if (webAvailablePort === -1) {
      exitWithError(undefined, {
        message: `Could not determine a free port for the web server`,
      })
    }
    webPortChangeNeeded = webAvailablePort !== webPreferredPort
  }

  // Check for port conflict and exit with message if found
  if (apiPortChangeNeeded || webPortChangeNeeded) {
    const message = [
      'The currently configured ports for the development server are',
      'unavailable. Suggested changes to your ports, which can be changed in',
      'redwood.toml, are:\n',
      apiPortChangeNeeded && ` - API to use port ${apiAvailablePort} instead`,
      apiPortChangeNeeded && 'of your currently configured',
      apiPortChangeNeeded && `${apiPreferredPort}\n`,
      webPortChangeNeeded && ` - Web to use port ${webAvailablePort} instead`,
      webPortChangeNeeded && 'of your currently configured',
      webPortChangeNeeded && `${webPreferredPort}\n`,
      '\nCannot run the development server until your configured ports are',
      'changed or become available.',
    ]
      .filter(Boolean)
      .join(' ')

    exitWithError(undefined, { message })
  }

  if (side.includes('api')) {
    try {
      await generatePrismaClient({
        verbose: false,
        force: false,
        schema: rwjsPaths.api.dbSchema,
      })
    } catch (e) {
      errorTelemetry(
        process.argv,
        `Error generating prisma client: ${e.message}`,
      )
      console.error(c.error(e.message))
    }

    // Again, if a server file is configured, we don't know what port it'll end
    // up using
    if (!serverFile) {
      try {
        await shutdownPort(apiAvailablePort)
      } catch (e) {
        errorTelemetry(process.argv, `Error shutting down "api": ${e.message}`)
        console.error(
          `Error whilst shutting down "api" port: ${c.error(e.message)}`,
        )
      }
    }
  }

  if (side.includes('web')) {
    try {
      await shutdownPort(webAvailablePort)
    } catch (e) {
      errorTelemetry(process.argv, `Error shutting down "web": ${e.message}`)
      console.error(
        `Error whilst shutting down "web" port: ${c.error(e.message)}`,
      )
    }
  }

  const getApiDebugFlag = () => {
    // Passed in flag takes precedence
    if (apiDebugPort) {
      return `--debug-port ${apiDebugPort}`
    } else if (argv.includes('--apiDebugPort')) {
      return `--debug-port ${defaultApiDebugPort}`
    }

    const apiDebugPortInToml = getConfig().api.debugPort
    if (apiDebugPortInToml) {
      return `--debug-port ${apiDebugPortInToml}`
    }

    // Don't pass in debug port flag, unless configured
    return ''
  }

  const redwoodConfigPath = getConfigPath()

  const streamingSsrEnabled = getConfig().experimental.streamingSsr?.enabled

  // @TODO (Streaming) Lot of temporary feature flags for started dev server.
  // Written this way to make it easier to read

  // 1. default: Vite (SPA)
  //
  // Disable the new warning in Vite v5 about the CJS build being deprecated
  // so that users don't have to see it every time the dev server starts up.
  process.env.VITE_CJS_IGNORE_WARNING = 'true'
  let webCommand = `yarn cross-env NODE_ENV=development rw-vite-dev ${forward}`

  // 2. Vite with SSR
  if (streamingSsrEnabled) {
    webCommand = `yarn cross-env NODE_ENV=development rw-dev-fe ${forward}`
  }

  /** @type {Record<string, import('concurrently').CommandObj>} */
  const jobs = {
    api: {
      name: 'api',
      command: [
        'yarn nodemon',
        '  --quiet',
        `  --watch "${redwoodConfigPath}"`,
        '  --exec "yarn rw-api-server-watch',
        `    --port ${apiAvailablePort}`,
        `    ${getApiDebugFlag()}`,
        '    | rw-log-formatter"',
      ]
        .join(' ')
        .replace(/\s+/g, ' '),
      env: {
        NODE_ENV: 'development',
        NODE_OPTIONS: getDevNodeOptions(),
      },
      prefixColor: 'cyan',
      runWhen: () => fs.existsSync(rwjsPaths.api.src),
    },
    web: {
      name: 'web',
      command: webCommand,
      prefixColor: 'blue',
      cwd: rwjsPaths.web.base,
      runWhen: () => fs.existsSync(rwjsPaths.web.src),
    },
    gen: {
      name: 'gen',
      command: 'yarn rw-gen-watch',
      prefixColor: 'green',
      runWhen: () => generate,
    },
  }

  // TODO: Convert jobs to an array and supply cwd command.
  const { result } = concurrently(
    Object.keys(jobs)
      .map((job) => {
        if (side.includes(job) || job === 'gen') {
          return jobs[job]
        }
      })
      .filter((job) => job && job.runWhen()),
    {
      prefix: '{name} |',
      timestampFormat: 'HH:mm:ss',
      handleInput: true,
    },
  )
  result.catch((e) => {
    if (typeof e?.message !== 'undefined') {
      errorTelemetry(
        process.argv,
        `Error concurrently starting sides: ${e.message}`,
      )
      exitWithError(e)
    }
  })
}

/**
 * Gets the value of the `NODE_OPTIONS` env var from `process.env`, appending `--enable-source-maps` if it's not already there.
 * See https://nodejs.org/api/cli.html#node_optionsoptions.
 *
 * @returns {string}
 */
export function getDevNodeOptions() {
  const { NODE_OPTIONS } = process.env
  const enableSourceMapsOption = '--enable-source-maps'

  if (!NODE_OPTIONS) {
    return enableSourceMapsOption
  }

  if (NODE_OPTIONS.includes(enableSourceMapsOption)) {
    return NODE_OPTIONS
  }

  return `${NODE_OPTIONS} ${enableSourceMapsOption}`
}
