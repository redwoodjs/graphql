import path from 'path'

import fs from 'fs-extra'
import { Listr } from 'listr2'

import { addWebPackages } from '@redwoodjs/cli-helpers'
import { errorTelemetry } from '@redwoodjs/telemetry'

import { getPaths, transformTSToJS, writeFile } from '../../../lib'
import c from '../../../lib/colors'
import { isTypeScriptProject } from '../../../lib/project'

const { version } = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../../../../package.json'), 'utf-8'),
)

export const handler = async ({ force, verbose, addPackage }) => {
  const ts = isTypeScriptProject()
  const tasks = new Listr(
    [
      {
        title: 'Adding vite.config.js...',
        task: async () => {
          // @NOTE: do not use getPaths().viteConfig because it'll come through as null
          // this is because we do a check for the file's existence in getPaths()
          const viteConfigPath = `${getPaths().web.base}/vite.config.${
            ts ? 'ts' : 'js'
          }`

          const templateContent = fs.readFileSync(
            path.resolve(__dirname, 'templates', 'vite.config.ts.template'),
            'utf-8',
          )

          const viteConfigContent = ts
            ? templateContent
            : await transformTSToJS(viteConfigPath, templateContent)

          return writeFile(viteConfigPath, viteConfigContent, {
            overwriteExisting: force,
          })
        },
      },
      {
        title:
          'Creating new entry point in `web/src/entry.client.{jsx,tsx}`...',
        task: () => {
          const entryPointFile = path.join(
            getPaths().web.src,
            `entry.client.${ts ? 'tsx' : 'jsx'}`,
          )

          const content = fs
            .readFileSync(
              path.join(
                getPaths().base,
                // NOTE we're copying over the index.js before babel transform
                'node_modules/@redwoodjs/web/src/entry/index.js',
              ),
              'utf-8',
            )
            .replace('~redwood-app-root', './App')

          return writeFile(entryPointFile, content, {
            overwriteExisting: force,
          })
        },
      },
      {
        // @NOTE: make sure its added as a dev package.
        ...addWebPackages(['-D', `@redwoodjs/vite@${version}`]),
        title: 'Adding @redwoodjs/vite dev dependency to web side...',
        skip: () => {
          if (!addPackage) {
            return 'Skipping package install, you will need to add @redwoodjs/vite manaually as a dev-dependency on the web workspace'
          }
        },
      },
    ],
    {
      rendererOptions: { collapseSubtasks: false },
      renderer: verbose ? 'verbose' : 'default',
    },
  )

  try {
    await tasks.run()
  } catch (e) {
    errorTelemetry(process.argv, e.message)
    console.error(c.error(e.message))
    process.exit(e?.exitCode || 1)
  }
}
