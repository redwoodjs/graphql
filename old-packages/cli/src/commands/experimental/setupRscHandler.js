import path from 'path'

import execa from 'execa'
import fs from 'fs-extra'
import { Listr } from 'listr2'

import { prettify } from '@redwoodjs/cli-helpers'
import { getConfig, getConfigPath } from '@redwoodjs/project-config'
import { errorTelemetry } from '@redwoodjs/telemetry'

import { getPaths, transformTSToJS, writeFile } from '../../lib'
import c from '../../lib/colors'
import { isTypeScriptProject } from '../../lib/project'

import { command, description, EXPERIMENTAL_TOPIC_ID } from './setupRsc'
import { printTaskEpilogue } from './util'

export const handler = async ({ force, verbose }) => {
  const rwPaths = getPaths()
  const redwoodTomlPath = getConfigPath()
  const configContent = fs.readFileSync(redwoodTomlPath, 'utf-8')
  const ext = path.extname(rwPaths.web.entryClient || '')

  const tasks = new Listr(
    [
      {
        title: 'Check prerequisites',
        task: () => {
          if (!rwPaths.web.entryClient || !rwPaths.web.viteConfig) {
            throw new Error('Vite needs to be setup before you can enable RSCs')
          }

          if (!getConfig().experimental?.streamingSsr?.enabled) {
            throw new Error(
              'The Streaming SSR experimental feature must be enabled before you can enable RSCs',
            )
          }

          if (!isTypeScriptProject()) {
            throw new Error(
              'RSCs are only supported in TypeScript projects at this time',
            )
          }
        },
      },
      {
        title: 'Adding config to redwood.toml...',
        task: (_ctx, task) => {
          if (!configContent.includes('[experimental.rsc]')) {
            writeFile(
              redwoodTomlPath,
              configContent.concat('\n[experimental.rsc]\n  enabled = true\n'),
              {
                overwriteExisting: true, // redwood.toml always exists
              },
            )
          } else {
            if (force) {
              task.output = 'Overwriting config in redwood.toml'

              writeFile(
                redwoodTomlPath,
                configContent.replace(
                  // Enable if it's currently disabled
                  '\n[experimental.rsc]\n  enabled = false\n',
                  '\n[experimental.rsc]\n  enabled = true\n',
                ),
                {
                  overwriteExisting: true, // redwood.toml always exists
                },
              )
            } else {
              task.skip(
                'The [experimental.rsc] config block already exists in your `redwood.toml` file.',
              )
            }
          }
        },
        rendererOptions: { persistentOutput: true },
      },
      {
        title: `Overwriting entry.client${ext}...`,
        task: async () => {
          const entryClientTemplate = fs.readFileSync(
            path.resolve(
              __dirname,
              'templates',
              'rsc',
              'entry.client.tsx.template',
            ),
            'utf-8',
          )
          const entryClientContent = isTypeScriptProject()
            ? entryClientTemplate
            : await transformTSToJS(
                rwPaths.web.entryClient,
                entryClientTemplate,
              )

          writeFile(rwPaths.web.entryClient, entryClientContent, {
            overwriteExisting: true,
          })
        },
      },
      {
        title: `Overwriting entry.server${ext}...`,
        task: async () => {
          const entryServerTemplate = fs.readFileSync(
            path.resolve(
              __dirname,
              'templates',
              'rsc',
              'entry.server.tsx.template',
            ),
            'utf-8',
          )
          // Can't use rwPaths.web.entryServer because it might not be not created yet
          const entryServerPath = path.join(
            rwPaths.web.src,
            `entry.server${ext}`,
          )
          const entryServerContent = isTypeScriptProject()
            ? entryServerTemplate
            : await transformTSToJS(entryServerPath, entryServerTemplate)

          writeFile(entryServerPath, entryServerContent, {
            overwriteExisting: true,
          })
        },
      },
      {
        title: `Overwriting Document${ext}...`,
        task: async () => {
          const documentTemplate = fs.readFileSync(
            path.resolve(
              __dirname,
              'templates',
              'rsc',
              'Document.tsx.template',
            ),
            'utf-8',
          )
          const documentPath = path.join(rwPaths.web.src, `Document${ext}`)
          const documentContent = isTypeScriptProject()
            ? documentTemplate
            : await transformTSToJS(documentPath, documentTemplate)

          writeFile(documentPath, documentContent, {
            overwriteExisting: true,
          })
        },
      },
      {
        title: 'Adding Pages...',
        task: async () => {
          const homePageTemplate = fs.readFileSync(
            path.resolve(
              __dirname,
              'templates',
              'rsc',
              'HomePage.tsx.template',
            ),
            'utf-8',
          )
          const homePagePath = path.join(
            rwPaths.web.pages,
            'HomePage',
            'HomePage.tsx',
          )

          writeFile(homePagePath, homePageTemplate, {
            overwriteExisting: force,
          })

          const aboutPageTemplate = fs.readFileSync(
            path.resolve(
              __dirname,
              'templates',
              'rsc',
              'AboutPage.tsx.template',
            ),
            'utf-8',
          )
          const aboutPagePath = path.join(
            rwPaths.web.pages,
            'AboutPage',
            'AboutPage.tsx',
          )

          writeFile(aboutPagePath, aboutPageTemplate, {
            overwriteExisting: force,
          })
        },
      },
      {
        title: 'Adding Counter.tsx...',
        task: async () => {
          const counterTemplate = fs.readFileSync(
            path.resolve(__dirname, 'templates', 'rsc', 'Counter.tsx.template'),
            'utf-8',
          )
          const counterPath = path.join(
            rwPaths.web.components,
            'Counter',
            'Counter.tsx',
          )

          writeFile(counterPath, counterTemplate, {
            overwriteExisting: force,
          })
        },
      },
      {
        title: 'Adding AboutCounter.tsx...',
        task: async () => {
          const counterTemplate = fs.readFileSync(
            path.resolve(
              __dirname,
              'templates',
              'rsc',
              'AboutCounter.tsx.template',
            ),
            'utf-8',
          )
          const counterPath = path.join(
            rwPaths.web.components,
            'Counter',
            'AboutCounter.tsx',
          )

          writeFile(counterPath, counterTemplate, {
            overwriteExisting: force,
          })
        },
      },
      {
        title: 'Adding CSS files...',
        task: async () => {
          const files = [
            {
              template: 'Counter.css.template',
              path: ['components', 'Counter', 'Counter.css'],
            },
            {
              template: 'Counter.module.css.template',
              path: ['components', 'Counter', 'Counter.module.css'],
            },
            {
              template: 'HomePage.css.template',
              path: ['pages', 'HomePage', 'HomePage.css'],
            },
            {
              template: 'HomePage.module.css.template',
              path: ['pages', 'HomePage', 'HomePage.module.css'],
            },
            {
              template: 'AboutPage.css.template',
              path: ['pages', 'AboutPage', 'AboutPage.css'],
            },
          ]

          files.forEach((file) => {
            const template = fs.readFileSync(
              path.resolve(__dirname, 'templates', 'rsc', file.template),
              'utf-8',
            )
            const filePath = path.join(rwPaths.web.src, ...file.path)

            writeFile(filePath, template, {
              overwriteExisting: force,
            })
          })
        },
      },
      {
        title: 'Adding Layout...',
        task: async () => {
          const layoutTemplate = fs.readFileSync(
            path.resolve(
              __dirname,
              'templates',
              'rsc',
              'NavigationLayout.tsx.template',
            ),
            'utf-8',
          )
          const layoutPath = path.join(
            rwPaths.web.layouts,
            'NavigationLayout',
            'NavigationLayout.tsx',
          )

          writeFile(layoutPath, layoutTemplate, { overwriteExisting: force })

          const cssTemplate = fs.readFileSync(
            path.resolve(
              __dirname,
              'templates',
              'rsc',
              'NavigationLayout.css.template',
            ),
            'utf-8',
          )
          const cssPath = path.join(
            rwPaths.web.layouts,
            'NavigationLayout',
            'NavigationLayout.css',
          )

          writeFile(cssPath, cssTemplate, { overwriteExisting: force })
        },
      },
      {
        title: 'Overwriting index.css...',
        task: async () => {
          const template = fs.readFileSync(
            path.resolve(__dirname, 'templates', 'rsc', 'index.css.template'),
            'utf-8',
          )
          const filePath = path.join(rwPaths.web.src, 'index.css')

          writeFile(filePath, template, {
            overwriteExisting: true,
          })
        },
      },
      {
        title: 'Add React experimental types...',
        task: async () => {
          const tsconfigPath = path.join(rwPaths.web.base, 'tsconfig.json')
          const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf-8'))

          if (tsconfig.compilerOptions.types.includes('react/experimental')) {
            return
          }

          tsconfig.compilerOptions.types.push('react/experimental')

          writeFile(
            tsconfigPath,
            await prettify('tsconfig.json', JSON.stringify(tsconfig, null, 2)),
            {
              overwriteExisting: true,
            },
          )
        },
      },
      {
        title: 'Overwriting routes...',
        task: async () => {
          const routesTemplate = fs.readFileSync(
            path.resolve(__dirname, 'templates', 'rsc', 'Routes.tsx.template'),
            'utf-8',
          )

          writeFile(rwPaths.web.routes, routesTemplate, {
            overwriteExisting: true,
          })
        },
      },
      {
        title: 'Updating React version...',
        task: async () => {
          // Fetch the web package.json from the main branch
          const canaryWebPackageJsonUrl =
            'https://raw.githubusercontent.com/redwoodjs/redwood/main/packages/create-redwood-app/templates/ts/web/package.json'
          const response = await fetch(canaryWebPackageJsonUrl)
          const canaryPackageJson = await response.json()

          // Read current package.json files
          const currentRootPackageJsonPath = path.join(
            rwPaths.base,
            'package.json',
          )
          const currentRootPackageJson = JSON.parse(
            fs.readFileSync(currentRootPackageJsonPath, 'utf-8'),
          )
          const currentWebPackageJsonPath = path.join(
            rwPaths.web.base,
            'package.json',
          )
          const currentWebPackageJson = JSON.parse(
            fs.readFileSync(currentWebPackageJsonPath, 'utf-8'),
          )

          // Update the versions to match
          const packagesToUpdate = ['react', 'react-dom']
          for (const packageName of packagesToUpdate) {
            currentRootPackageJson.resolutions ||= {}
            currentRootPackageJson.resolutions[packageName] =
              canaryPackageJson.dependencies[packageName]
            currentWebPackageJson.dependencies[packageName] =
              canaryPackageJson.dependencies[packageName]
          }
          writeFile(
            currentWebPackageJsonPath,
            JSON.stringify(currentWebPackageJson, null, 2),
            {
              overwriteExisting: true,
            },
          )

          // Run yarn install to apply the changes
          await execa('yarn', [], {
            cwd: getPaths().web.base,
          })
        },
      },
      {
        task: () => {
          printTaskEpilogue(command, description, EXPERIMENTAL_TOPIC_ID)
        },
      },
    ],
    {
      rendererOptions: { collapseSubtasks: false, persistentOutput: true },
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
