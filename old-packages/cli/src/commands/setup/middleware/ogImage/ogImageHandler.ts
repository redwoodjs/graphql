import path from 'node:path'

import fs from 'fs-extra'
import { Listr } from 'listr2'
import { format } from 'prettier'

import { addWebPackages, getPrettierOptions } from '@redwoodjs/cli-helpers'
import { getConfig, getPaths } from '@redwoodjs/project-config'

import { runTransform } from '../../../../lib/runTransform'

export async function handler({ force }: { force: boolean }) {
  const rwPaths = getPaths()
  const rootPkgJson = fs.readJSONSync(path.join(rwPaths.base, 'package.json'))
  const currentProjectVersion = rootPkgJson.devDependencies['@redwoodjs/core']

  const notes: string[] = ['']
  const tasks = new Listr(
    [
      {
        title: 'Check prerequisites',
        skip: force,
        task: () => {
          if (!getConfig().experimental?.streamingSsr?.enabled) {
            throw new Error(
              'The Streaming SSR experimental feature must be enabled before you can setup middleware.\n\nRun this command to setup streaming ssr: \n  yarn rw exp setup-streaming-ssr\n',
            )
          }
        },
      },
      addWebPackages([`@redwoodjs/ogimage-gen@${currentProjectVersion}`]),
      {
        title: 'Add OG Image middleware ...',
        task: async () => {
          const serverEntryPath = rwPaths.web.entryServer
          if (serverEntryPath === null) {
            throw new Error(
              'Could not find the server entry file. Is your project using the default structure?',
            )
          }

          const transformResult = await runTransform({
            transformPath: path.join(__dirname, 'codemodMiddleware.js'),
            targetPaths: [serverEntryPath],
          })

          if (transformResult.error) {
            throw new Error(transformResult.error)
          }
        },
      },
      {
        title: 'Add OG Image vite plugin ...',
        task: async () => {
          const viteConfigPath = rwPaths.web.viteConfig
          if (viteConfigPath === null) {
            throw new Error('Could not find the Vite config file')
          }

          const transformResult = await runTransform({
            transformPath: path.join(__dirname, 'codemodVitePlugin.js'),
            targetPaths: [viteConfigPath],
          })

          if (transformResult.error) {
            throw new Error(transformResult.error)
          }
        },
      },
      {
        title: 'Prettifying changed files',
        task: async (_ctx, task) => {
          const prettifyPaths = [
            rwPaths.web.entryServer,
            rwPaths.web.viteConfig,
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
      {
        title: 'One more thing...',
        task: () => {
          // Note: We avoid logging in the task because it can mess up the formatting of the text and we are often looking to maintain some basic indentation and such.
          notes.push(
            "og:image generation is almost ready to go! You'll need to add playwright as a dependency to the web side and then install the headless browser packages:",
          )
          notes.push('')
          notes.push('  yarn workspace web add playwright')
          notes.push('  yarn workspace web playwright install')
          notes.push('')
          notes.push(
            'Depending on how your host is configured you may need to install additional dependencies first. If so, the `playwright install` step will error out and give you the command to run to install those deps.',
          )
          notes.push('')
        },
      },
    ],
    { rendererOptions: { collapseSubtasks: false } },
  )

  try {
    await tasks.run()
    console.log(notes.join('\n'))
  } catch (e: any) {
    console.error(e.message)
    process.exit(e?.exitCode || 1)
  }
}
