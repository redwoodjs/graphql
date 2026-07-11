import path from 'path'

import execa from 'execa'
import fs from 'fs-extra'
import { Listr } from 'listr2'
import terminalLink from 'terminal-link'

import { recordTelemetryAttributes } from '@redwoodjs/cli-helpers'
import { buildApi, cleanApiBuild } from '@redwoodjs/internal/dist/build/api'
import { generate } from '@redwoodjs/internal/dist/generate/generate'
import { loadAndValidateSdls } from '@redwoodjs/internal/dist/validateSchema'
import { detectPrerenderRoutes } from '@redwoodjs/prerender/detection'
import { timedTelemetry } from '@redwoodjs/telemetry'

import { getPaths, getConfig } from '../lib'
import { generatePrismaCommand } from '../lib/generatePrismaClient'

export const handler = async ({
  side = ['api', 'web'],
  verbose = false,
  prisma = true,
  prerender,
}) => {
  recordTelemetryAttributes({
    command: 'build',
    side: JSON.stringify(side),
    verbose,
    prisma,
    prerender,
  })

  const rwjsPaths = getPaths()
  const rwjsConfig = getConfig()
  const useFragments = rwjsConfig.graphql?.fragments
  const useTrustedDocuments = rwjsConfig.graphql?.trustedDocuments

  const prismaSchemaExists = fs.existsSync(rwjsPaths.api.dbSchema)
  const prerenderRoutes =
    prerender && side.includes('web') ? detectPrerenderRoutes() : []
  const shouldGeneratePrismaClient =
    prisma &&
    prismaSchemaExists &&
    (side.includes('api') || prerenderRoutes.length > 0)

  const tasks = [
    shouldGeneratePrismaClient && {
      title: 'Generating Prisma Client...',
      task: () => {
        const { cmd, args } = generatePrismaCommand(rwjsPaths.api.dbSchema)
        return execa(cmd, args, {
          stdio: verbose ? 'inherit' : 'pipe',
          shell: true,
          cwd: rwjsPaths.api.base,
        })
      },
    },
    // If using GraphQL Fragments or Trusted Documents, then we need to use
    // codegen to generate the types needed for possible types and the
    // trusted document store hashes
    (useFragments || useTrustedDocuments) && {
      title: `Generating types needed for ${[
        useFragments && 'GraphQL Fragments',
        useTrustedDocuments && 'Trusted Documents',
      ]
        .filter(Boolean)
        .join(' and ')} support...`,
      task: async () => {
        await generate()
      },
    },
    side.includes('api') && {
      title: 'Verifying graphql schema...',
      task: loadAndValidateSdls,
    },
    side.includes('api') && {
      title: 'Building API...',
      task: async () => {
        await cleanApiBuild()
        const { errors, warnings } = await buildApi()

        if (errors.length) {
          console.error(errors)
        }
        if (warnings.length) {
          console.warn(warnings)
        }
      },
    },
    side.includes('web') && {
      title: 'Building Web...',
      task: async () => {
        // @NOTE: we're using the vite build command here, instead of the
        // buildWeb function directly because we want the process.cwd to be
        // the web directory, not the root of the project.
        // This is important for postcss/tailwind to work correctly
        // Having a separate binary lets us contain the change of cwd to that
        // process only. If we changed cwd here, or in the buildWeb function,
        // it could affect other things that run in parallel while building.
        // We don't have any parallel tasks right now, but someone might add
        // one in the future as a performance optimization.
        //
        // Disable the new warning in Vite v5 about the CJS build being deprecated
        // so that users don't have to see it when this command is called with --verbose
        process.env.VITE_CJS_IGNORE_WARNING = 'true'
        await execa(
          `node ${require.resolve(
            '@redwoodjs/vite/bins/rw-vite-build.mjs',
          )} --webDir="${rwjsPaths.web.base}" --verbose=${verbose}`,
          {
            stdio: verbose ? 'inherit' : 'pipe',
            shell: true,
            // `cwd` is needed for yarn to find the rw-vite-build binary
            // It won't change process.cwd for anything else here, in this
            // process
            cwd: rwjsPaths.web.base,
          },
        )

        // Streaming SSR does not use the index.html file.
        if (!getConfig().experimental?.streamingSsr?.enabled) {
          console.log('Creating 200.html...')

          const indexHtmlPath = path.join(getPaths().web.dist, 'index.html')

          fs.copyFileSync(
            indexHtmlPath,
            path.join(getPaths().web.dist, '200.html'),
          )
        }
      },
    },
  ].filter(Boolean)

  const triggerPrerender = async () => {
    console.log('Starting prerendering...')
    if (prerenderRoutes.length === 0) {
      console.log(
        `You have not marked any routes to "prerender" in your ${terminalLink(
          'Routes',
          'file://' + rwjsPaths.web.routes,
        )}.`,
      )

      return
    }

    // Running a separate process here, otherwise it wouldn't pick up the
    // generated Prisma Client due to require module caching
    await execa('yarn rw prerender', {
      stdio: 'inherit',
      shell: true,
      cwd: rwjsPaths.web.base,
    })
  }

  const jobs = new Listr(tasks, {
    renderer: verbose && 'verbose',
  })

  await timedTelemetry(process.argv, { type: 'build' }, async () => {
    await jobs.run()

    if (side.includes('web') && prerender && prismaSchemaExists) {
      // This step is outside Listr so that it prints clearer, complete messages
      await triggerPrerender()
    }
  })
}
