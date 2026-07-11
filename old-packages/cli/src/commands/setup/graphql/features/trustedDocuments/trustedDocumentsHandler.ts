import fs from 'node:fs'
import path from 'node:path'

import execa from 'execa'
import { Listr } from 'listr2'
import { format } from 'prettier'

import { getPrettierOptions, setTomlSetting } from '@redwoodjs/cli-helpers'
import { getConfig, getPaths, resolveFile } from '@redwoodjs/project-config'

import { runTransform } from '../../../../../lib/runTransform'

export async function handler({ force }: { force: boolean }) {
  const tasks = new Listr(
    [
      {
        title:
          'Update Redwood Project Configuration to enable GraphQL Trusted Documents ...',
        skip: () => {
          if (force) {
            // Never skip when --force is used
            return false
          }

          const config = getConfig()
          if (config.graphql.trustedDocuments) {
            return 'GraphQL Trusted Documents are already enabled in your Redwood project.'
          }

          return false
        },
        task: () => {
          setTomlSetting('graphql', 'trustedDocuments', true)
        },
      },
      {
        title: 'Generating Trusted Documents store ...',
        task: () => {
          execa.commandSync('yarn redwood generate types', { stdio: 'ignore' })
        },
      },
      {
        title:
          'Configuring the GraphQL Handler to use a Trusted Documents store ...',
        task: async () => {
          const graphqlPath = resolveFile(
            path.join(getPaths().api.functions, 'graphql'),
          )

          if (!graphqlPath) {
            throw new Error('Could not find a GraphQL handler in your project.')
          }

          const transformResult = await runTransform({
            transformPath: path.join(__dirname, 'graphqlTransform.js'),
            targetPaths: [graphqlPath],
          })

          if (transformResult.error) {
            throw new Error(transformResult.error)
          }

          const source = fs.readFileSync(graphqlPath, 'utf-8')

          const prettierOptions = await getPrettierOptions()

          const prettifiedApp = await format(source, {
            ...prettierOptions,
            parser: 'babel-ts',
          })

          fs.writeFileSync(graphqlPath, prettifiedApp, 'utf-8')
        },
      },
    ],
    { rendererOptions: { collapseSubtasks: false } },
  )

  try {
    await tasks.run()
  } catch (e: any) {
    console.error(e.message)
    process.exit(e?.exitCode || 1)
  }
}
