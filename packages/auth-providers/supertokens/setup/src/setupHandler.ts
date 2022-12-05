import fs from 'fs'

import { standardAuthHandler } from '@redwoodjs/cli-helpers'

import { Args } from './setup'

const { version } = JSON.parse(fs.readFileSync('package.json', 'utf-8'))

export async function handler({ force: forceArg }: Args) {
  standardAuthHandler({
    basedir: __dirname,
    forceArg,
    provider: 'supertokens',
    authDecoderImport:
      "import { authDecoder } from '@redwoodjs/supertokens-api'",
    apiPackages: [`@redwoodjs/supertokens-api@${version}`, 'supertokens-node'],
    webPackages: [
      `@redwoodjs/supertokens-web@${version}`,
      'supertokens-auth-react',
    ],
    notes: [
      "We've generated some example recipe implementations, but do feel free",
      'to switch to something else that better fit your needs.',
      'See: https://supertokens.com/docs/guides',
    ],
  })
}
