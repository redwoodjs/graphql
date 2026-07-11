import type { ListrTask } from 'listr2'
import { Listr } from 'listr2'
import terminalLink from 'terminal-link'
import type { Argv } from 'yargs'

import { errorTelemetry } from '@redwoodjs/telemetry'

import { colors } from '../lib/colors.js'
import {
  addApiPackages,
  addWebPackages,
  installPackages,
} from '../lib/installHelpers.js'

import type { AuthGeneratorCtx } from './authTasks.js'
import {
  addAuthConfigToGqlApi,
  addConfigToRoutes,
  addConfigToWebApp,
  setAuthSetupMode,
  createWebAuth,
  generateAuthApiFiles,
} from './authTasks.js'

export const standardAuthBuilder = (yargs: Argv) => {
  return yargs
    .option('force', {
      alias: 'f',
      default: false,
      description: 'Overwrite existing auth configuration',
      type: 'boolean',
    })
    .option('verbose', {
      alias: 'v',
      default: false,
      description: 'Log setup output',
      type: 'boolean',
    })
    .epilogue(
      `Also see the ${terminalLink(
        'Redwood CLI Reference',
        'https://redwoodjs.com/docs/cli-commands#setup-auth',
      )}`,
    )
}

export interface AuthHandlerArgs {
  basedir: string
  forceArg: boolean
  provider: string
  authDecoderImport?: string
  webAuthn?: boolean
  webPackages?: string[]
  apiPackages?: string[]
  extraTasks?: (ListrTask<AuthGeneratorCtx> | undefined)[]
  notes?: string[]
  verbose?: boolean
}

// from lodash
type Truthy<T> = T extends false | '' | 0 | null | undefined ? never : T

function truthy<T>(value: T): value is Truthy<T> {
  return !!value
}

/**
 * basedir assumes that you must have a templates folder in that directory.
 * See folder structure of auth providers in packages/auth-providers/<provider>/setup/src
 */
export const standardAuthHandler = async ({
  basedir,
  forceArg,
  provider,
  authDecoderImport,
  webAuthn = false,
  webPackages = [],
  apiPackages = [],
  extraTasks,
  notes,
  verbose,
}: AuthHandlerArgs) => {
  // @TODO detect if auth already setup. If it is, ask how to proceed:
  // How would you like to proceed?
  // 1. Replace existing auth provider with <provider>
  // 2. Combine providers ~~ NOT SUPPORTED YET ~~

  const tasks = new Listr<AuthGeneratorCtx, 'verbose' | 'default'>(
    [
      setAuthSetupMode(forceArg),
      generateAuthApiFiles(basedir, webAuthn),

      addConfigToWebApp(),
      createWebAuth(basedir, webAuthn),
      addConfigToRoutes(),

      addAuthConfigToGqlApi(authDecoderImport),
      webPackages.length && addWebPackages(webPackages),
      apiPackages.length && addApiPackages(apiPackages),
      (webPackages.length || apiPackages.length) && installPackages,
      ...(extraTasks || []).filter(truthy),
      notes && {
        title: 'One more thing...',
        task: (ctx: AuthGeneratorCtx) => {
          // Can't console.log the notes here because of
          // https://github.com/cenk1cenk2/listr2/issues/296
          // So we do it after the tasks have all finished instead
          if (ctx.setupMode === 'REPLACE') {
            notes.push(
              ...[
                '',
                `${colors.warning(
                  'Your existing auth provider has been replaced!',
                )}`,
                "You'll still need to manually remove your old auth provider's config,",
                "functions, and dependencies (in your web and api package.json's).",
              ],
            )
          }

          if (ctx.setupMode === 'COMBINE') {
            notes.push(
              colors.warning(
                "To avoid overwriting existing files we've generated new file " +
                  'names for the newly generated files. This probably means ' +
                  `${ctx.provider} auth doesn't work out of the box. You'll most ` +
                  'likely have to manually merge some of the generated files ' +
                  'with your existing auth files',
              ),
            )
          }
        },
      },
    ].filter(truthy),
    {
      rendererOptions: { collapseSubtasks: false },
      renderer: verbose ? 'verbose' : 'default',
      ctx: {
        setupMode: 'UNKNOWN',
        provider, // provider name passed from CLI
        force: forceArg,
      },
    },
  )

  try {
    await tasks.run()
    if (notes) {
      console.log(`\n   ${notes.join('\n   ')}\n`)
    }
  } catch (e) {
    if (isErrorWithMessage(e)) {
      errorTelemetry(process.argv, e.message)
      console.error(colors.error(e.message))
    }

    if (isErrorWithErrorCode(e)) {
      process.exit(e.exitCode || 1)
    } else {
      process.exit(1)
    }
  }
}

function isErrorWithMessage(e: any): e is { message: string } {
  return !!e.message
}

function isErrorWithErrorCode(e: any): e is { exitCode: number } {
  return !isNaN(e.exitCode)
}
