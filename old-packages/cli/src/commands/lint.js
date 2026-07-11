import execa from 'execa'
import fs from 'fs-extra'
import terminalLink from 'terminal-link'

import { recordTelemetryAttributes } from '@redwoodjs/cli-helpers'

import { getPaths } from '../lib'

export const command = 'lint [path..]'
export const description = 'Lint your files'
export const builder = (yargs) => {
  yargs
    .positional('path', {
      description:
        'Specify file(s) or directory(ies) to lint relative to project root',
      type: 'array',
    })
    .option('fix', {
      default: false,
      description: 'Try to fix errors',
      type: 'boolean',
    })
    .epilogue(
      `Also see the ${terminalLink(
        'Redwood CLI Reference',
        'https://redwoodjs.com/docs/cli-commands#lint',
      )}`,
    )
}

export const handler = async ({ path, fix }) => {
  recordTelemetryAttributes({
    command: 'lint',
    fix,
  })

  try {
    const pathString = path?.join(' ')
    const result = await execa(
      'yarn eslint',
      [
        fix && '--fix',
        !pathString && fs.existsSync(getPaths().web.src) && 'web/src',
        !pathString && fs.existsSync(getPaths().web.config) && 'web/config',
        !pathString &&
          fs.existsSync(getPaths().web.storybook) &&
          'web/.storybook',
        !pathString && fs.existsSync(getPaths().scripts) && 'scripts',
        !pathString && fs.existsSync(getPaths().api.src) && 'api/src',
        pathString,
      ].filter(Boolean),
      {
        cwd: getPaths().base,
        shell: true,
        stdio: 'inherit',
      },
    )

    process.exitCode = result.exitCode
  } catch (error) {
    process.exitCode = error.exitCode ?? 1
  }
}
