import path from 'node:path'

import fs from 'fs-extra'
import { Listr } from 'listr2'
import { format } from 'prettier'

import { addApiPackages, getPrettierOptions } from '@redwoodjs/cli-helpers'
import { errorTelemetry } from '@redwoodjs/telemetry'

import { getPaths, transformTSToJS, writeFile } from '../../../lib'
import c from '../../../lib/colors'
import { isTypeScriptProject } from '../../../lib/project'
import { runTransform } from '../../../lib/runTransform'

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
        title: `Adding signedUrl function...`,
        task: async () => {
          const templatePath = path.resolve(
            __dirname,
            'templates',
            'signedUrl.ts.template',
          )
          const templateContent = fs.readFileSync(templatePath, {
            encoding: 'utf8',
            flag: 'r',
          })

          const uploadsPath = path.join(
            getPaths().api.functions,
            `signedUrl.${projectIsTypescript ? 'ts' : 'js'}`,
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
        ...addApiPackages([`@redwoodjs/storage@${redwoodVersion}`]),
        title: 'Adding dependencies to your api side...',
      },
      {
        title: 'Modifying api/src/lib/db to add uploads prisma extension..',
        task: async () => {
          const dbPath = path.join(
            getPaths().api.lib,
            `db.${projectIsTypescript ? 'ts' : 'js'}`,
          )

          const transformResult = await runTransform({
            transformPath: path.join(__dirname, 'dbCodemod.js'),
            targetPaths: [dbPath],
          })

          if (transformResult.error) {
            if (transformResult.error === 'RW_CODEMOD_ERR_OLD_FORMAT') {
              throw new Error(
                'It looks like your src/lib/db file is using the old format. Please update it as per the v8 upgrade guide: https://redwoodjs.com/upgrade/v8#database-file-structure-change. And run again. \n\nYou can also manually modify your api/src/lib/db to include the prisma extension: https://docs.redwoodjs.com/docs/uploads/#attaching-the-prisma-extension',
              )
            }

            throw new Error(
              'Could not add the prisma extension. \n Please modify your api/src/lib/db to include the prisma extension: https://docs.redwoodjs.com/docs/uploads/#attaching-the-prisma-extension',
            )
          }
        },
      },
      {
        title: 'Prettifying changed files',
        task: async (_ctx, task) => {
          const prettifyPaths = [
            path.join(getPaths().api.lib, 'db.js'),
            path.join(getPaths().api.lib, 'db.ts'),
            path.join(getPaths().api.lib, 'uploads.js'),
            path.join(getPaths().api.lib, 'uploads.ts'),
          ]

          for (const prettifyPath of prettifyPaths) {
            try {
              if (!fs.existsSync(prettifyPath)) {
                continue
              }
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
      {
        title: 'One more thing...',
        task: (_ctx, task) => {
          task.title = `One more thing...

          ${c.success('\nUploads and storage configured!\n')}

          Remember to add UPLOADS_SECRET to your .env file. You can generate one with ${c.highlight('yarn rw generate secret')}


          Check out the docs for more info:
          ${c.link('https://docs.redwoodjs.com/docs/uploads')}

        `
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
