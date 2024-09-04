import path, { format } from 'path'

import fs from 'fs-extra'
import { Listr } from 'listr2'

import { addApiPackages, getPrettierOptions } from '@redwoodjs/cli-helpers'
import { errorTelemetry } from '@redwoodjs/telemetry'

import { runTransform } from '../../../../lib/runTransform'
import { getPaths, transformTSToJS, writeFile } from '../../../lib'
import c from '../../../lib/colors'
import { isTypeScriptProject } from '../../../lib/project'

export const handler = async ({ force }) => {
  const projectIsTypescript = isTypeScriptProject()
  const redwoodVersion =
    require(path.join(getPaths().base, 'package.json')).devDependencies[
      '@redwoodjs/core'
    ] ?? 'latest'

  const tasks = new Listr(
    [
      {
        title: `Adding api/src/lib/uploads.${
          projectIsTypescript ? 'ts' : 'js'
        }...`,
        task: async () => {
          const templatePath = path.resolve(
            __dirname,
            'templates',
            'srcLibUploads.ts.template',
          )
          const templateContent = fs.readFileSync(templatePath, {
            encoding: 'utf8',
            flag: 'r',
          })

          const uploadsPath = path.join(
            getPaths().api.lib,
            `uploads.${projectIsTypescript ? 'ts' : 'js'}`,
          )
          const uploadsContent = projectIsTypescript
            ? templateContent
            : await transformTSToJS(uploadsPath, templateContent)

          return writeFile(uploadsPath, uploadsContent, {
            overwriteExisting: force,
          })
        },
      },
      {
        task: async () => {
          const dbPath = getPaths().api.db

          const transformResult = await runTransform({
            transformPath: path.join(__dirname, 'dbCodemod.js'),
            targetPaths: [dbPath],
          })

          if (transformResult.error) {
            throw new Error(transformResult.error)
          }
        },
      },
      {
        ...addApiPackages([`@redwoodjs/storage@${redwoodVersion}`]),
        title: 'Adding dependencies to your api side...',
      },
      {
        title: 'Prettifying changed files',
        task: async (_ctx, task) => {
          const prettifyPaths = [
            getPaths().api.db,
            path.join(getPaths().api.lib, 'uploads.js'),
            path.join(getPaths().api.lib, 'uploads.ts'),
          ]
          for (const prettifyPath of prettifyPaths) {
            if (prettifyPath === null) {
              throw new Error('Could not find the file to be prettified')
            }
            try {
              const source = fs.readFileSync(prettifyPath, 'utf-8')
              const prettierOptions = await getPrettierOptions()
              const prettifiedApp = await format(source, {
                ...prettierOptions,
                parser: 'babel-ts',
              })

              fs.writeFileSync(prettifyPath, prettifiedApp, 'utf-8')
            } catch {
              task.output =
                "Couldn't prettify the changes. Please reformat the files manually if needed."
            }
          }
        },
      },
    ],
    {
      rendererOptions: { collapseSubtasks: false },
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
