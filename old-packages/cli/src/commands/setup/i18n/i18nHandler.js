import path from 'path'

import execa from 'execa'
import fs from 'fs-extra'
import { Listr } from 'listr2'

import { errorTelemetry } from '@redwoodjs/telemetry'

import { getPaths, writeFile } from '../../../lib'
import c from '../../../lib/colors'
import extendStorybookConfiguration from '../../../lib/configureStorybook.js'
import { fileIncludes } from '../../../lib/extendFile'

const APP_JS_PATH = getPaths().web.app

const i18nImportExist = (appJS) => {
  let content = appJS.toString()

  const hasBaseImport = () => /import '.\/i18n'/.test(content)

  return hasBaseImport()
}
const addI18nImport = (appJS) => {
  var content = appJS.toString().split('\n').reverse()
  const index = content.findIndex((value) => /import/.test(value))
  content.splice(index, 0, "import './i18n'")
  return content.reverse().join(`\n`)
}

const i18nConfigExists = () => {
  return fs.existsSync(path.join(getPaths().web.src, 'i18n.js'))
}
const localesExists = (lng) => {
  return fs.existsSync(path.join(getPaths().web.src, 'locales', lng + '.json'))
}

export const handler = async ({ force }) => {
  const rwPaths = getPaths()
  const tasks = new Listr(
    [
      {
        title: 'Installing packages...',
        task: async () => {
          return new Listr(
            [
              {
                title:
                  'Install i18next, react-i18next and i18next-browser-languagedetector',
                task: async () => {
                  /**
                   * Install i18next, react-i18next and i18next-browser-languagedetector
                   */
                  await execa('yarn', [
                    'workspace',
                    'web',
                    'add',
                    'i18next',
                    'react-i18next',
                    'i18next-browser-languagedetector',
                  ])
                },
              },
            ],
            { rendererOptions: { collapseSubtasks: false } },
          )
        },
      },
      {
        title: 'Configure i18n...',
        task: () => {
          /**
           *  Write i18n.js in web/src
           *
           * Check if i18n config already exists.
           * If it exists, throw an error.
           */
          if (!force && i18nConfigExists()) {
            throw new Error(
              'i18n config already exists.\nUse --force to override existing config.',
            )
          } else {
            return writeFile(
              path.join(getPaths().web.src, 'i18n.js'),
              fs
                .readFileSync(
                  path.resolve(__dirname, 'templates', 'i18n.js.template'),
                )
                .toString(),
              { overwriteExisting: force },
            )
          }
        },
      },
      {
        title: 'Adding locale file for French...',
        task: () => {
          /**
           * Make web/src/locales if it doesn't exist
           * and write fr.json there
           *
           * Check if fr.json already exists.
           * If it exists, throw an error.
           */

          if (!force && localesExists('fr')) {
            throw new Error(
              'fr.json config already exists.\nUse --force to override existing config.',
            )
          } else {
            return writeFile(
              path.join(getPaths().web.src, '/locales/fr.json'),
              fs
                .readFileSync(
                  path.resolve(__dirname, 'templates', 'fr.json.template'),
                )
                .toString(),
              { overwriteExisting: force },
            )
          }
        },
      },
      {
        title: 'Adding locale file for English...',
        task: () => {
          /**
           * Make web/src/locales if it doesn't exist
           * and write en.json there
           *
           * Check if en.json already exists.
           * If it exists, throw an error.
           */
          if (!force && localesExists('en')) {
            throw new Error(
              'en.json already exists.\nUse --force to override existing config.',
            )
          } else {
            return writeFile(
              path.join(getPaths().web.src, '/locales/en.json'),
              fs
                .readFileSync(
                  path.resolve(__dirname, 'templates', 'en.json.template'),
                )
                .toString(),
              { overwriteExisting: force },
            )
          }
        },
      },
      {
        title: 'Adding import to App.{jsx,tsx}...',
        task: (_ctx, task) => {
          /**
           * Add i18n import to the last import of App.{jsx,tsx}
           *
           * Check if i18n import already exists.
           * If it exists, throw an error.
           */
          let appJS = fs.readFileSync(APP_JS_PATH)
          if (i18nImportExist(appJS)) {
            task.skip('Import already exists in App.js')
          } else {
            fs.writeFileSync(APP_JS_PATH, addI18nImport(appJS))
          }
        },
      },
      {
        title: 'Configuring Storybook...',
        // skip this task if the user's storybook config already includes "withI18n"
        skip: () => fileIncludes(rwPaths.web.storybookConfig, 'withI18n'),
        task: async () =>
          extendStorybookConfiguration(
            path.join(__dirname, 'templates', 'storybook.preview.tsx.template'),
          ),
      },
      {
        title: 'One more thing...',
        task: (_ctx, task) => {
          task.title = `One more thing...\n
          ${c.tip('Quick link to the docs:')}\n
          ${c.link('https://react.i18next.com/guides/quick-start/')}
        `
        },
      },
    ],
    { rendererOptions: { collapseSubtasks: false } },
  )

  try {
    await tasks.run()
  } catch (e) {
    errorTelemetry(process.argv, e.message)
    console.error(c.error(e.message))
    process.exit(e?.exitCode || 1)
  }
}
