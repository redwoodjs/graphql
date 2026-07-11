import path from 'path'

import camelcase from 'camelcase'
import { Listr } from 'listr2'
import pascalcase from 'pascalcase'
import pluralize, { singular } from 'pluralize'
import prompts from 'prompts'

import { generate as generateTypes } from '@redwoodjs/internal/dist/generate/generate'
import { errorTelemetry } from '@redwoodjs/telemetry'

// Move this check out of experimental when server file is moved as well
import {
  generateTemplate,
  getPaths,
  transformTSToJS,
  writeFile,
} from '../../../lib'
import c from '../../../lib/colors'
import { isTypeScriptProject } from '../../../lib/project'
import { isRealtimeSetup, isServerFileSetup } from '../../experimental/util.js'

const templateVariables = (name) => {
  name = singular(name.toLowerCase())

  return {
    name,
    collectionName: pluralize(name),
    pluralName: pluralize(name),
    pluralPascalName: pascalcase(pluralize(name)),
    camelName: camelcase(name),
    functionName: camelcase(name),
    liveQueryName: `recent${pascalcase(pluralize(name))}`,
    subscriptionQueryName: `recent${pascalcase(pluralize(name))}`,
    subscriptionName: `listenTo${pascalcase(name)}Channel`,
    modelName: pascalcase(name),
    typeName: pascalcase(name),
    channelName: `${pascalcase(name)}Channel`,
    subscriptionInputType: `Publish${pascalcase(name)}Input`,
    subscriptionServiceResolver: `publishTo${pascalcase(name)}Channel`,
  }
}

export async function handler({ name, type, force, verbose }) {
  const redwoodPaths = getPaths()
  const ts = isTypeScriptProject()
  name = singular(name.toLowerCase())

  let functionType = type

  // Prompt to select what type if not specified
  if (!functionType) {
    const response = await prompts({
      type: 'select',
      name: 'functionType',
      choices: [
        {
          value: 'liveQuery',
          title: 'Live Query',
          description: 'Create a Live Query to watch for changes in data',
        },
        {
          value: 'subscription',
          title: 'Subscription',
          description: 'Create a Subscription to watch for events',
        },
      ],
      message: 'What type of realtime event would you like to create?',
    })

    functionType = response.functionType
  }

  const tasks = new Listr(
    [
      {
        title: 'Checking for realtime environment prerequisites ...',
        task: () => {
          isServerFileSetup() && isRealtimeSetup()
        },
      },
      {
        title: `Adding ${name} example subscription ...`,
        enabled: () => functionType === 'subscription',
        task: async () => {
          // sdl

          const exampleSdlTemplateContent = path.resolve(
            __dirname,
            'templates',
            'subscriptions',
            'blank',
            `blank.sdl.ts.template`,
          )

          const sdlFile = path.join(
            redwoodPaths.api.graphql,
            `${name}.sdl.${isTypeScriptProject() ? 'ts' : 'js'}`,
          )

          const sdlContent = ts
            ? exampleSdlTemplateContent
            : await transformTSToJS(sdlFile, exampleSdlTemplateContent)

          // service

          const exampleServiceTemplateContent = path.resolve(
            __dirname,
            'templates',
            'subscriptions',
            'blank',
            `blank.service.ts.template`,
          )
          const serviceFile = path.join(
            redwoodPaths.api.services,
            `${name}`,
            `${name}.${isTypeScriptProject() ? 'ts' : 'js'}`,
          )

          const serviceContent = ts
            ? exampleServiceTemplateContent
            : await transformTSToJS(serviceFile, exampleServiceTemplateContent)

          // subscription

          const exampleSubscriptionTemplateContent = path.resolve(
            __dirname,
            'templates',
            'subscriptions',
            'blank',
            `blank.ts.template`,
          )

          const exampleFile = path.join(
            redwoodPaths.api.subscriptions,
            `${name}`,
            `${name}.${isTypeScriptProject() ? 'ts' : 'js'}`,
          )

          const setupScriptContent = ts
            ? exampleSubscriptionTemplateContent
            : await transformTSToJS(
                exampleFile,
                exampleSubscriptionTemplateContent,
              )

          // write all files
          return [
            writeFile(
              sdlFile,
              await generateTemplate(sdlContent, templateVariables(name)),
              {
                overwriteExisting: force,
              },
            ),
            writeFile(
              serviceFile,
              await generateTemplate(serviceContent, templateVariables(name)),
              {
                overwriteExisting: force,
              },
            ),
            writeFile(
              exampleFile,
              await generateTemplate(
                setupScriptContent,
                templateVariables(name),
              ),
              {
                overwriteExisting: force,
              },
            ),
          ]
        },
      },
      {
        title: `Adding ${name} example live query ...`,
        enabled: () => functionType === 'liveQuery',
        task: async () => {
          // sdl
          const exampleSdlTemplateContent = path.resolve(
            __dirname,
            'templates',
            'liveQueries',
            'blank',
            `blank.sdl.ts.template`,
          )
          const sdlFile = path.join(
            redwoodPaths.api.graphql,
            `${name}.sdl.${isTypeScriptProject() ? 'ts' : 'js'}`,
          )
          const sdlContent = ts
            ? exampleSdlTemplateContent
            : await transformTSToJS(sdlFile, exampleSdlTemplateContent)

          // service
          const exampleServiceTemplateContent = path.resolve(
            __dirname,
            'templates',
            'liveQueries',
            'blank',
            'blank.service.ts.template',
          )

          const serviceFile = path.join(
            redwoodPaths.api.services,
            `${name}`,
            `${name}.${isTypeScriptProject() ? 'ts' : 'js'}`,
          )
          const serviceContent = ts
            ? exampleServiceTemplateContent
            : await transformTSToJS(serviceFile, exampleServiceTemplateContent)

          // write all files
          return [
            writeFile(
              sdlFile,
              await generateTemplate(sdlContent, templateVariables(name)),
              {
                overwriteExisting: force,
              },
            ),
            writeFile(
              serviceFile,
              await generateTemplate(serviceContent, templateVariables(name)),
              {
                overwriteExisting: force,
              },
            ),
          ]
        },
      },
      {
        title: `Generating types ...`,
        task: async () => {
          await generateTypes()
          console.log(
            'Note: You may need to manually restart GraphQL in VSCode to see the new types take effect.\n\n',
          )
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
