// inspired by gatsby/packages/gatsby-cli/src/create-cli.js and
// gridsome/packages/cli/lib/commands/info.js
import fs from 'node:fs'

import envinfo from 'envinfo'
import terminalLink from 'terminal-link'

import { recordTelemetryAttributes } from '@redwoodjs/cli-helpers'
import { getPaths } from '@redwoodjs/project-config'

export const command = 'info'
export const description = 'Print your system environment information'
export const builder = (yargs) => {
  yargs.epilogue(
    `Also see the ${terminalLink(
      'Redwood CLI Reference',
      'https://redwoodjs.com/docs/cli-commands#info',
    )}`,
  )
}
export const handler = async () => {
  recordTelemetryAttributes({ command: 'info' })

  const output = await envinfo.run({
    System: ['OS', 'Shell'],
    Binaries: ['Node', 'Yarn'],
    Browsers: ['Chrome', 'Edge', 'Firefox', 'Safari'],
    // yarn workspaces not supported :-/
    npmPackages: '@redwoodjs/*',
    Databases: ['SQLite'],
  })

  const redwoodToml = fs.readFileSync(getPaths().base + '/redwood.toml', 'utf8')

  console.log(
    output +
      '  redwood.toml:\n' +
      redwoodToml
        .split('\n')
        .filter((line) => line.trim().length > 0)
        .filter((line) => !/^#/.test(line))
        .map((line) => `    ${line}`)
        .join('\n'),
  )
}
