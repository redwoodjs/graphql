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
    provider: 'azureActiveDirectory',
    authDecoderImport:
      "import { authDecoder } from '@redwoodjs/auth-azure-active-directory-api'",
    apiPackages: [`@redwoodjs/auth-azure-active-directory-api@${version}`],
    webPackages: [
      `@redwoodjs/auth-azure-active-directory-web@${version}`,
      '@azure/msal-browser@^2',
    ],
    notes: [
      "You'll need to add four env vars to your .env file:",
      '',
      '```bash title=".env"',
      'AZURE_ACTIVE_DIRECTORY_CLIENT_ID="..."',
      `# Where \`tenantId\` is your app's "Directory (tenant) ID"`,
      'AZURE_ACTIVE_DIRECTORY_AUTHORITY="https://login.microsoftonline.com/${tenantId}}"',
      'AZURE_ACTIVE_DIRECTORY_REDIRECT_URI="http://localhost:8910"',
      'AZURE_ACTIVE_DIRECTORY_LOGOUT_REDIRECT_URI="http://localhost:8910/login"',
      '```',
      '',
      "You can find their values on your Azure app's dashboard.",
      'Be sure to include them in the `includeEnvironmentVariables` array in redwood.toml:',
      '',
      '```toml title="redwood.toml"',
      'includeEnvironmentVariables = [',
      '  "AZURE_ACTIVE_DIRECTORY_CLIENT_ID",',
      '  "AZURE_ACTIVE_DIRECTORY_AUTHORITY",',
      '  "AZURE_ACTIVE_DIRECTORY_REDIRECT_URI",',
      '  "AZURE_ACTIVE_DIRECTORY_LOGOUT_REDIRECT_URI"',
      ']',
      '```',
      '',
      'Also see https://redwoodjs.com/docs/auth/azure for a full walkthrough.',
    ],
  })
}
