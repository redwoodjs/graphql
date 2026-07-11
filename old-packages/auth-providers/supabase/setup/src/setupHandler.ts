import fs from 'fs'
import path from 'path'

import { standardAuthHandler } from '@redwoodjs/cli-helpers'

import type { Args } from './setup'

const { version } = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../package.json'), 'utf-8'),
)

export const handler = async ({ force: forceArg }: Args) => {
  standardAuthHandler({
    basedir: __dirname,
    forceArg,
    provider: 'supabase',
    authDecoderImport: `import { authDecoder } from '@redwoodjs/auth-supabase-api'`,
    apiPackages: [`@redwoodjs/auth-supabase-api@${version}`],
    webPackages: [
      `@redwoodjs/auth-supabase-web@${version}`,
      '@supabase/supabase-js@^2',
    ],
    notes: [
      "You'll need to add two env vars to your .env file:",
      '',
      '```bash title=".env"',
      'SUPABASE_URL="..."',
      'SUPABASE_KEY="..."',
      'SUPABASE_JWT_SECRET="..."',
      '```',
      '',
      "You can find their values on your Supabase app's dashboard.",
      'Be sure to include them in the `includeEnvironmentVariables` array in redwood.toml:',
      '',
      '```toml title="redwood.toml"',
      'includeEnvironmentVariables = [',
      '  "SUPABASE_URL",',
      '  "SUPABASE_KEY",',
      ']',
      '```',
      '',
      'Also see https://redwoodjs.com/docs/auth/supabase for a full walkthrough.',
    ],
  })
}
