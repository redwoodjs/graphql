// import terminalLink from 'terminal-link'
import path from 'path'

import { Listr } from 'listr2'

import { recordTelemetryAttributes } from '@redwoodjs/cli-helpers'
import { errorTelemetry } from '@redwoodjs/telemetry'

import { getPaths, printSetupNotes } from '../../../../lib'
import c from '../../../../lib/colors'
import { addFilesTask, updateApiURLTask } from '../helpers'
import { NETLIFY_TOML } from '../templates/netlify'

export const command = 'netlify'
export const description = 'Setup Netlify deploy'

const files = [
  {
    path: path.join(getPaths().base, 'netlify.toml'),
    content: NETLIFY_TOML,
  },
]

const notes = [
  'You are ready to deploy to Netlify!',
  'See: https://redwoodjs.com/docs/deploy/netlify',
]

export const handler = async ({ force }) => {
  recordTelemetryAttributes({
    command: 'setup deploy netlify',
    force,
  })
  const tasks = new Listr(
    [
      updateApiURLTask('/.netlify/functions'),
      addFilesTask({ files, force }),
      printSetupNotes(notes),
    ],
    { rendererOptions: { collapseSubtasks: false } },
  )
  try {
    await tasks.run()
  } catch (e) {
    errorTelemetry(process.argv, e.message)
    console.error(c.error(e.message))
    process.exit(e?.exitCode || 1)
  }
}
