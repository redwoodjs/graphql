import fs from 'fs'
import path from 'path'

import { getPaths, standardAuthHandler } from '@redwoodjs/cli-helpers'

import type { Args } from './setup'

export async function handler({ force: forceArg }: Args) {
  const { version } = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, '../package.json'), 'utf-8'),
  )

  standardAuthHandler({
    basedir: __dirname,
    forceArg,
    provider: 'supertokens',
    authDecoderImport:
      "import { authDecoder } from '@redwoodjs/auth-supertokens-api'",
    apiPackages: [
      `@redwoodjs/auth-supertokens-api@${version}`,
      'supertokens-node@^15',
    ],
    webPackages: [
      `@redwoodjs/auth-supertokens-web@${version}`,
      'supertokens-auth-react@~0.34.0',
      'supertokens-web-js@~0.7.0',
    ],
    extraTasks: [addRoutingLogic],
    notes: [
      "We've implemented SuperToken's EmailPassword with Social / Enterprise (OAuth 2.0, SAML) login recipe,",
      'but feel free to switch to something that better fits your needs. See https://supertokens.com/docs/guides.',
      '',
      "To get things working, you'll need to add quite a few env vars to your .env file.",
      'See https://redwoodjs.com/docs/auth/supertokens for a full walkthrough.',
    ],
  })
}

// Exported for testing.
export const addRoutingLogic = {
  title: `Adding SuperTokens routing logic to Routes.{jsx,tsx}...`,
  task: () => {
    const routesPath = getPaths().web.routes

    let content = fs.readFileSync(routesPath, 'utf-8')

    // Remove the old setup if it's there.
    content = content
      .replace("import SuperTokens from 'supertokens-auth-react'", '')
      .replace(/if \(SuperTokens.canHandleRoute\(\)\) {[^}]+}/, '')

    if (!/\s*if\s*\(canHandleRoute\(PreBuiltUI\)\)\s*\{/.test(content)) {
      let hasImportedSuperTokensFunctions = false

      content = content
        .split('\n')
        .reduce<string[]>((acc, line) => {
          // Add the SuperTokens import before the first import from a RedwoodJS package.
          if (
            !hasImportedSuperTokensFunctions &&
            line.includes('import') &&
            line.includes('@redwoodjs')
          ) {
            acc.push(
              "import { canHandleRoute, getRoutingComponent } from 'supertokens-auth-react/ui'",
            )
            acc.push('')

            hasImportedSuperTokensFunctions = true
          }

          acc.push(line)

          return acc
        }, [])
        .join('\n')
      content = content.replace(
        "import { useAuth } from './auth'",
        "import { useAuth, PreBuiltUI } from './auth'",
      )

      content = content.replace(
        /const Routes = \(\) => \{\n/,
        'const Routes = () => {\n' +
          '  if (canHandleRoute(PreBuiltUI)) {\n' +
          '    return getRoutingComponent(PreBuiltUI)\n' +
          '  }\n\n',
      )

      fs.writeFileSync(routesPath, content)
    }
  },
}
