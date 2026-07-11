import fs from 'fs'
import path from 'path'

import { standardAuthHandler } from '@redwoodjs/cli-helpers'

import type { Args } from './setup'

const { version } = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../package.json'), 'utf-8'),
)

export async function handler({ force: forceArg }: Args) {
  standardAuthHandler({
    basedir: __dirname,
    forceArg,
    provider: 'netlify',
    authDecoderImport: `import { authDecoder } from '@redwoodjs/auth-netlify-api'`,
    apiPackages: [`@redwoodjs/auth-netlify-api@${version}`],
    webPackages: [
      `@redwoodjs/auth-netlify-web@${version}`,
      'netlify-identity-widget@^1',
    ],
    notes: [
      "You'll need to enable Identity on your Netlify site and configure the API endpoint locally.",
      'See https://redwoodjs.com/docs/auth/netlify for a full walkthrough.',
    ],
  })
}
