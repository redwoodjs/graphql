import path from 'path'

import { Listr } from 'listr2'

import { recordTelemetryAttributes } from '@redwoodjs/cli-helpers'
import { errorTelemetry } from '@redwoodjs/telemetry'

import { getPaths, printSetupNotes, writeFile } from '../../../../lib'
import c from '../../../../lib/colors'
import { updateApiURLTask } from '../helpers'

export const command = 'vercel'
export const description = 'Setup Vercel deploy'

export async function handler(options) {
  recordTelemetryAttributes({
    command: 'setup deploy vercel',
  })

  const tasks = new Listr(
    [
      updateApiURLTask('/api'),
      writeVercelConfigTask({ overwriteExisting: options.force }),
      printSetupNotes(notes),
    ],
    {
      rendererOptions: { collapseSubtasks: false },
    },
  )

  try {
    await tasks.run()
  } catch (e) {
    errorTelemetry(process.argv, e.message)
    console.error(c.error(e.message))
    process.exit(e?.exitCode || 1)
  }
}

function writeVercelConfigTask({ overwriteExisting = false } = {}) {
  return {
    title: 'Writing vercel.json...',
    task: (_ctx, task) => {
      writeFile(
        path.join(getPaths().base, 'vercel.json'),
        JSON.stringify(vercelConfig, null, 2),
        { overwriteExisting },
        task,
      )
    },
  }
}

const vercelConfig = {
  build: {
    env: {
      ENABLE_EXPERIMENTAL_COREPACK: '1',
    },
  },
}

const notes = [
  'You are ready to deploy to Vercel!',
  'See: https://redwoodjs.com/docs/deploy#vercel-deploy',
]
