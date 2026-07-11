import fs from 'node:fs'
import path from 'node:path'

import execa from 'execa'
import { Listr } from 'listr2'
import { format } from 'prettier'

import {
  colors,
  getPrettierOptions,
  setTomlSetting,
} from '@redwoodjs/cli-helpers'
import { getConfig, getPaths } from '@redwoodjs/project-config'

import { runTransform } from '../../../../../lib/runTransform'

import type { Args } from './fragments'

export const command = 'fragments'
export const description = 'Set up Fragments for GraphQL'

export async function handler({ force }: Args) {
  const tasks = new Listr(
    [
      {
        title:
          'Update Redwood Project Configuration to enable GraphQL Fragments',
        skip: () => {
          if (force) {
            // Never skip when --force is used
            return false
          }

          const config = getConfig()
          if (config.graphql.fragments) {
            return 'GraphQL Fragments are already enabled.'
          }

          return false
        },
        task: () => {
          setTomlSetting('graphql', 'fragments', true)
        },
      },
      {
        title: 'Generate possibleTypes.ts',
        task: () => {
          execa.commandSync('yarn redwood generate types', { stdio: 'ignore' })
        },
      },
      {
        title: 'Import possibleTypes in App.tsx',
        task: () => {
          return runTransform({
            transformPath: path.join(__dirname, 'appImportTransform.js'),
            targetPaths: [getPaths().web.app],
          })
        },
      },
      {
        title: 'Add possibleTypes to the GraphQL cache config',
        task: async () => {
          const transformResult = await runTransform({
            transformPath: path.join(__dirname, 'appGqlConfigTransform.js'),
            targetPaths: [getPaths().web.app],
          })

          if (transformResult.error) {
            throw new Error(transformResult.error)
          }

          const appPath = getPaths().web.app
          const source = fs.readFileSync(appPath, 'utf-8')

          const prettierOptions = await getPrettierOptions()

          const prettifiedApp = await format(source, {
            ...prettierOptions,
            parser: 'babel-ts',
          })

          fs.writeFileSync(getPaths().web.app, prettifiedApp, 'utf-8')
        },
      },
    ],
    { rendererOptions: { collapseSubtasks: false } },
  )

  try {
    await tasks.run()
  } catch (e: any) {
    console.error(colors.error(e.message))
    process.exit(e?.exitCode || 1)
  }
}
