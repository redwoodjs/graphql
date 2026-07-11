import path from 'node:path'

import execa from 'execa'
import fs from 'fs-extra'
import { Listr } from 'listr2'
import semver from 'semver'

import { getConfigPath } from '@redwoodjs/project-config'
import { errorTelemetry } from '@redwoodjs/telemetry'

import { getPaths, writeFile } from '../../lib'
import c from '../../lib/colors'

import {
  command,
  description,
  EXPERIMENTAL_TOPIC_ID,
} from './setupReactCompiler'
import { printTaskEpilogue } from './util'

export const handler = async ({ force, verbose }) => {
  const rwPaths = getPaths()
  const redwoodTomlPath = getConfigPath()
  const configContent = fs.readFileSync(redwoodTomlPath, 'utf-8')

  const tasks = new Listr(
    [
      {
        title: 'Check prerequisites',
        skip: force,
        task: () => {
          // We require vite as that is how we have conditionally integrated the compiler
          if (!rwPaths.web.entryClient || !rwPaths.web.viteConfig) {
            throw new Error(
              'Vite needs to be setup before you can enable React Compiler',
            )
          }

          // Check that the project is using at least react version 19, as required by the compiler
          const webPkgJson = fs.readJSONSync(
            path.join(rwPaths.web.base, 'package.json'),
          )
          const reactVersion = webPkgJson['dependencies']['react']
          const coercedReactVersion = semver.coerce(reactVersion)
          if (!semver.gte(coercedReactVersion, '19.0.0')) {
            throw new Error(
              'You need to be using at least React version 19 to enable the React Compiler',
            )
          }
        },
      },
      {
        title: 'Adding config to redwood.toml...',
        task: (_ctx, task) => {
          if (!configContent.includes('[experimental.reactCompiler]')) {
            writeFile(
              redwoodTomlPath,
              configContent.concat(
                '\n[experimental.reactCompiler]\n  enabled = true\n  lintOnly = false\n',
              ),
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
                  '\n[experimental.reactCompiler]\n  enabled = false\n',
                  '\n[experimental.reactCompiler]\n  enabled = true\n',
                ),
                {
                  overwriteExisting: true, // redwood.toml always exists
                },
              )
            } else {
              task.skip(
                'The [experimental.reactCompiler] config block already exists in your `redwood.toml` file.',
              )
            }
          }
        },
        rendererOptions: { persistentOutput: true },
      },
      // We are using two different yarn commands here which is fine because they're operating on different
      // workspaces - web and the root
      {
        title: 'Installing eslint-plugin-react-compiler',
        task: async () => {
          await execa('yarn', ['add', '-D', 'eslint-plugin-react-compiler'], {
            cwd: getPaths().base,
          })
        },
      },
      {
        title: 'Installing babel-plugin-react-compiler',
        task: async () => {
          await execa(
            'yarn',
            ['web/', 'add', '-D', 'babel-plugin-react-compiler'],
            {
              cwd: getPaths().base,
            },
          )
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
