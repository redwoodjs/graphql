import fs from 'fs'
import path from 'path'

import {
  isTypeScriptProject,
  standardAuthHandler,
} from '@redwoodjs/cli-helpers'

import type { Args } from './setup'

const { version } = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../package.json'), 'utf-8'),
)

export async function handler({ force: forceArg }: Args) {
  const authFilename = isTypeScriptProject() ? 'auth.ts' : 'auth.js'

  standardAuthHandler({
    basedir: __dirname,
    forceArg,
    provider: 'custom',
    webPackages: [`@redwoodjs/auth@${version}`],
    notes: [
      'Done! But you have a little more work to do.',
      "You'll have to write the actual implementation yourself.",
      `Take a look in ${authFilename}, and for a full walkthrough`,
      'see https://redwoodjs.com/docs/auth/custom.',
    ],
  })
}
