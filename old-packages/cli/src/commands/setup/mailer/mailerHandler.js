import path from 'path'

import fs from 'fs-extra'
import { Listr } from 'listr2'

import { addApiPackages } from '@redwoodjs/cli-helpers'
import { errorTelemetry } from '@redwoodjs/telemetry'

import { getPaths, transformTSToJS, writeFile } from '../../../lib'
import c from '../../../lib/colors'
import { isTypeScriptProject } from '../../../lib/project'

export const handler = async ({ force, skipExamples }) => {
  const projectIsTypescript = isTypeScriptProject()
  const redwoodVersion =
    require(path.join(getPaths().base, 'package.json')).devDependencies[
      '@redwoodjs/core'
    ] ?? 'latest'

  const tasks = new Listr(
    [
      {
        title: `Adding api/src/lib/mailer.${
          projectIsTypescript ? 'ts' : 'js'
        }...`,
        task: async () => {
          const templatePath = path.resolve(
            __dirname,
            'templates',
            'mailer.ts.template',
          )
          const templateContent = fs.readFileSync(templatePath, {
            encoding: 'utf8',
            flag: 'r',
          })

          const mailerPath = path.join(
            getPaths().api.lib,
            `mailer.${projectIsTypescript ? 'ts' : 'js'}`,
          )
          const mailerContent = projectIsTypescript
            ? templateContent
            : await transformTSToJS(mailerPath, templateContent)

          return writeFile(mailerPath, mailerContent, {
            overwriteExisting: force,
          })
        },
      },
      {
        title: 'Adding api/src/mail directory...',
        task: () => {
          const mailDir = path.join(getPaths().api.mail)
          if (!fs.existsSync(mailDir)) {
            fs.mkdirSync(mailDir)
          }
        },
      },
      {
        title: `Adding example ReactEmail mail template`,
        skip: () => skipExamples,
        task: async () => {
          const templatePath = path.resolve(
            __dirname,
            'templates',
            're-example.tsx.template',
          )
          const templateContent = fs.readFileSync(templatePath, {
            encoding: 'utf8',
            flag: 'r',
          })

          const exampleTemplatePath = path.join(
            getPaths().api.mail,
            'Example',
            `Example.${projectIsTypescript ? 'tsx' : 'jsx'}`,
          )
          const exampleTemplateContent = projectIsTypescript
            ? templateContent
            : await transformTSToJS(exampleTemplatePath, templateContent)

          return writeFile(exampleTemplatePath, exampleTemplateContent, {
            overwriteExisting: force,
          })
        },
      },
      {
        // Add production dependencies
        ...addApiPackages([
          `@redwoodjs/mailer-core@${redwoodVersion}`,
          `@redwoodjs/mailer-handler-nodemailer@${redwoodVersion}`,
          `@redwoodjs/mailer-renderer-react-email@${redwoodVersion}`,
          `@react-email/components`, // NOTE: Unpinned dependency here
        ]),
        title: 'Adding production dependencies to your api side...',
      },
      {
        // Add development dependencies
        ...addApiPackages([
          '-D',
          `@redwoodjs/mailer-handler-in-memory@${redwoodVersion}`,
          `@redwoodjs/mailer-handler-studio@${redwoodVersion}`,
        ]),
        title: 'Adding development dependencies to your api side...',
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
