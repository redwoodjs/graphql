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
    provider: 'auth0',
    authDecoderImport:
      "import { authDecoder } from '@redwoodjs/auth-auth0-api'",
    apiPackages: [`@redwoodjs/auth-auth0-api@${version}`],
    webPackages: [
      '@auth0/auth0-spa-js@^2',
      `@redwoodjs/auth-auth0-web@${version}`,
    ],
    notes: [
      "You'll need to add four env vars to your .env file:",
      '',
      '```bash title=".env"',
      'AUTH0_DOMAIN ="Domain"',
      'AUTH0_CLIENT_ID ="Client ID"',
      'AUTH0_REDIRECT_URI="http://localhost:8910"',
      'AUTH0_AUDIENCE="API Audience"',
      '```',
      '',
      "You can find their values on your Auth0 app's dashboard.",
      'Be sure to include them in the `includeEnvironmentVariables` array in redwood.toml:',
      '',
      '```toml title="redwood.toml"',
      'includeEnvironmentVariables = [',
      '  "AUTH0_DOMAIN",',
      '  "AUTH0_CLIENT_ID",',
      '  "AUTH0_REDIRECT_URI",',
      '  "AUTH0_AUDIENCE"',
      ']',
      '```',
      '',
      'Also see https://redwoodjs.com/docs/auth/auth0 for a full walkthrough.',
    ],
  })
}
