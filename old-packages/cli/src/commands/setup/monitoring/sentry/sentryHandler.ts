import path from 'path'

import fs from 'fs-extra'
import { Listr } from 'listr2'

import {
  addApiPackages,
  addEnvVarTask,
  addWebPackages,
  colors,
  getPaths,
  isTypeScriptProject,
  prettify,
  writeFilesTask,
} from '@redwoodjs/cli-helpers'
import { errorTelemetry } from '@redwoodjs/telemetry'

import type { Args } from './sentry'

const rwPaths = getPaths()

export const handler = async ({ force }: Args) => {
  const extension = isTypeScriptProject() ? 'ts' : 'js'

  const notes: string[] = []

  const tasks = new Listr([
    addApiPackages(['@envelop/sentry@5', '@sentry/node@7']),
    addWebPackages(['@sentry/react@7', '@sentry/browser@7']),
    addEnvVarTask(
      'SENTRY_DSN',
      '',
      'https://docs.sentry.io/product/sentry-basics/dsn-explainer/',
    ),
    {
      title: 'Setting up Sentry on the API and web sides',
      task: () => {
        return writeFilesTask(
          {
            [path.join(rwPaths.api.lib, `sentry.${extension}`)]: fs
              .readFileSync(
                path.join(__dirname, 'templates/sentryApi.ts.template'),
              )
              .toString(),
            [path.join(rwPaths.web.src, 'lib', `sentry.${extension}`)]: fs
              .readFileSync(
                path.join(__dirname, 'templates/sentryWeb.ts.template'),
              )
              .toString(),
          },
          { existingFiles: force ? 'OVERWRITE' : 'SKIP' },
        )
      },
    },
    {
      title: 'Implementing the Envelop plugin',
      task: async (ctx) => {
        const graphqlHandlerPath = path.join(
          rwPaths.api.functions,
          `graphql.${extension}`,
        )

        const contentLines = fs
          .readFileSync(graphqlHandlerPath)
          .toString()
          .split('\n')

        const handlerIndex = contentLines.findLastIndex((line) =>
          line.startsWith('export const handler = createGraphQLHandler({'),
        )

        const pluginsIndex = contentLines.findLastIndex((line) =>
          line.includes('extraPlugins:'),
        )

        if (handlerIndex === -1 || pluginsIndex !== -1) {
          ctx.addEnvelopPluginSkipped = true
          return
        }

        contentLines.splice(
          handlerIndex,
          1,
          "import 'src/lib/sentry'",
          '',
          'export const handler = createGraphQLHandler({',
          'extraPlugins: [useSentry({',
          '  includeRawResult: true,',
          '  includeResolverArgs: true,',
          '  includeExecuteVariables: true,',
          '})],',
        )

        contentLines.splice(0, 0, "import { useSentry } from '@envelop/sentry'")

        fs.writeFileSync(
          graphqlHandlerPath,
          await prettify('graphql.ts', contentLines.join('\n')),
        )
      },
    },
    {
      title: "Replacing Redwood's Error boundary",
      task: async () => {
        const contentLines = fs
          .readFileSync(rwPaths.web.app)
          .toString()
          .split('\n')

        const webImportIndex = contentLines.findLastIndex((line) =>
          /^import { FatalErrorBoundary, RedwoodProvider } from '@redwoodjs\/web'$/.test(
            line,
          ),
        )
        contentLines.splice(
          webImportIndex,
          1,
          "import { RedwoodProvider } from '@redwoodjs/web'",
        )

        const boundaryOpenIndex = contentLines.findLastIndex((line) =>
          line.includes('<FatalErrorBoundary page={FatalErrorPage}>'),
        )
        contentLines.splice(
          boundaryOpenIndex,
          1,
          '<Sentry.ErrorBoundary fallback={FatalErrorPage}>',
        )

        const boundaryCloseIndex = contentLines.findLastIndex((line) =>
          line.includes('</FatalErrorBoundary>'),
        )
        contentLines.splice(boundaryCloseIndex, 1, '</Sentry.ErrorBoundary>')

        contentLines.splice(0, 0, "import Sentry from 'src/lib/sentry'")

        fs.writeFileSync(
          rwPaths.web.app,
          await prettify('App.tsx', contentLines.join('\n')),
        )
      },
    },
    {
      title: 'One more thing...',
      task: (ctx) => {
        notes.push(
          colors.important(
            'You will need to add `SENTRY_DSN` to `includeEnvironmentVariables` in redwood.toml.',
          ),
        )

        if (ctx.addEnvelopPluginSkipped) {
          notes.push(
            `${colors.underline(
              'Make sure you implement the Sentry Envelop plugin:',
            )} https://redwoodjs.com/docs/cli-commands#sentry-envelop-plugin`,
          )
        } else {
          notes.push(
            'Check out the RedwoodJS forums for more: https://community.redwoodjs.com/t/sentry-error-and-performance-monitoring-experimental/4880',
          )
        }
      },
    },
  ])

  try {
    await tasks.run()
    console.log(notes.join('\n'))
  } catch (e) {
    if (isErrorWithMessage(e)) {
      errorTelemetry(process.argv, e.message)
      console.error(colors.error(e.message))
    }

    if (isErrorWithExitCode(e)) {
      process.exit(e.exitCode)
    }

    process.exit(1)
  }
}

function isErrorWithMessage(e: unknown): e is { message: string } {
  return !!e && typeof e === 'object' && 'message' in e
}

function isErrorWithExitCode(e: unknown): e is { exitCode: number } {
  return (
    !!e &&
    typeof e === 'object' &&
    'exitCode' in e &&
    typeof e.exitCode === 'number'
  )
}
