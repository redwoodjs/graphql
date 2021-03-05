import fs from 'fs'
import path from 'path'

import chalk from 'chalk'
import execa from 'execa'
import Listr from 'listr'

import { getPaths, writeFile } from 'src/lib'
import c from 'src/lib/colors'

export const command = 'i18n'
export const description = 'Setup i18n'
export const builder = (yargs) => {
  yargs.option('force', {
    alias: 'f',
    default: false,
    description: 'Overwrite existing configuration',
    type: 'boolean',
  })
}

const APP_JS_PATH = path.join(getPaths().web.src, 'App.js')

const i18nImportsExist = (appJS) => {
  let content = appJS.toString()

  const hasBaseImport = () => /import '.\/i18n'/.test(content)

  return hasBaseImport()
}
const i18nConfigExists = () => {
  return fs.existsSync(path.join(getPaths().web.src, 'i18n.js'))
}
const localesExists = (lng) => {
  return fs.existsSync(path.join(getPaths().web.src.locales, lng + '.json'))
}

export const handler = async ({ force }) => {
  const tasks = new Listr([
    {
      title: 'Installing packages...',
      task: async () => {
        return new Listr([
          {
            title:
              'Install i18n, i18next, react-i18next and i18next-browser-languagedetector',
            task: async () => {
              /**
               * Install i18n, i18next, react-i18next and i18next-browser-languagedetector
               */
              await execa('yarn', [
                'workspace',
                'web',
                'add',
                'i18n',
                'i18next',
                'react-i18next',
                'i18next-browser-languagedetector',
              ])
            },
          },
        ])
      },
    },
    {
      title: 'Configuring i18n...',
      task: () => {
        /**
         *  Write i18n.js in web/src
         *
         * Check if i18n config already exists.
         * If it exists, throw an error.
         */
        if (!force && i18nConfigExists()) {
          throw new Error(
            'i18n config already exists.\nUse --force to override existing config.'
          )
        } else {
          return writeFile(
            path.join(getPaths().web.src, 'i18n.js'),
            fs
              .readFileSync(
                path.resolve(__dirname, 'templates', 'i18n.js.template')
              )
              .toString(),
            { overwriteExisting: force }
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
            'fr.json config already exists.\nUse --force to override existing config.'
          )
        } else {
          return writeFile(
            path.join(getPaths().web.src, '/locales/fr.json'),
            fs
              .readFileSync(
                path.resolve(__dirname, 'templates', 'fr.json.template')
              )
              .toString(),
            { overwriteExisting: force }
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
            'en.json already exists.\nUse --force to override existing config.'
          )
        } else {
          return writeFile(
            path.join(getPaths().web.src, '/locales/en.json'),
            fs
              .readFileSync(
                path.resolve(__dirname, 'templates', 'en.json.template')
              )
              .toString(),
            { overwriteExisting: force }
          )
        }
      },
    },
    {
      title: 'Adding import to App.js...',
      task: (_ctx, task) => {
        /**
         * Add i18n import to the top of App.js
         *
         * Check if i18n import already exists.
         * If it exists, throw an error.
         */
        let appJS = fs.readFileSync(APP_JS_PATH)
        if (i18nImportsExist(appJS)) {
          task.skip('Import already exists in App.js')
        } else {
          appJS = [`import './i18n'`, appJS].join(`\n`)
          fs.writeFileSync(APP_JS_PATH, appJS)
        }
      },
    },
    {
      title: 'One more thing...',
      task: (_ctx, task) => {
        task.title = `One more thing...\n
          ${c.green('Quick link to the docs:')}\n
          ${chalk.hex('#e8e8e8')(
            'https://react.i18next.com/guides/quick-start/'
          )}
        `
      },
    },
  ])

  try {
    await tasks.run()
  } catch (e) {
    console.error(c.error(e.message))
    process.exit(e?.exitCode || 1)
  }
}
