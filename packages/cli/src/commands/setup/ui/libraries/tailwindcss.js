import fs from 'fs'
import path from 'path'

import execa from 'execa'
import { outputFileSync } from 'fs-extra'
import { Listr } from 'listr2'
import terminalLink from 'terminal-link'

import { recordTelemetryAttributes } from '@redwoodjs/cli-helpers'
import { errorTelemetry } from '@redwoodjs/telemetry'

import { getPaths, usingVSCode } from '../../../../lib'
import c from '../../../../lib/colors'
import { isTypeScriptProject } from '../../../../lib/project'

export const command = 'tailwindcss'
export const aliases = ['tailwind', 'tw']
export const description = 'Set up tailwindcss and PostCSS'
export const builder = (yargs) => {
  yargs.option('force', {
    alias: 'f',
    default: false,
    description: 'Overwrite existing configuration',
    type: 'boolean',
  })

  yargs.option('install', {
    alias: 'i',
    default: true,
    description: 'Install packages',
    type: 'boolean',
  })
}

const tailwindDirectives = [
  '@tailwind base;',
  '@tailwind components;',
  '@tailwind utilities;',
]

/** @param {string} indexCSS */
const tailwindDirectivesExist = (indexCSS) =>
  tailwindDirectives.every((tailwindDirective) =>
    indexCSS.includes(tailwindDirective)
  )

const tailwindImportsAndNotes = [
  '/**',
  ' * START --- SETUP TAILWINDCSS EDIT',
  ' *',
  ' * `yarn rw setup ui tailwindcss` placed these directives here',
  " * to inject Tailwind's styles into your CSS.",
  ' * For more information, see: https://tailwindcss.com/docs/installation',
  ' */',
  ...tailwindDirectives,
  '/**',
  ' * END --- SETUP TAILWINDCSS EDIT',
  ' */\n',
]

export const handler = async ({ force, install }) => {
  recordTelemetryAttributes({
    command: 'setup ui tailwindcss',
    force,
    install,
  })
  const rwPaths = getPaths()

  const projectPackages = ['prettier-plugin-tailwindcss']

  const webWorkspacePackages = [
    'postcss',
    'postcss-loader',
    'tailwindcss',
    'autoprefixer',
  ]

  const recommendedVSCodeExtensions = [
    'csstools.postcss',
    'bradlc.vscode-tailwindcss',
  ]

  const recommendationTexts = {
    'csstools.postcss':
      'We recommend that you install ' +
      terminalLink(
        'the PostCSS Language Support VSCode extension',
        'https://marketplace.visualstudio.com/items?itemName=csstools.postcss'
      ),
    'bradlc.vscode-tailwindcss':
      'We recommend that you install ' +
      terminalLink(
        'the Tailwind CSS IntelliSense VSCode extension',
        'https://marketplace.visualstudio.com/items?itemName=bradlc.vscode-tailwindcss'
      ),
  }

  const tasks = new Listr(
    [
      {
        title: 'Installing project-wide packages...',
        skip: () => !install,
        task: () => {
          return new Listr(
            [
              {
                title: `Install ${projectPackages.join(', ')}`,
                task: async () => {
                  const yarnVersion = await execa('yarn', ['--version'])
                  const isYarnV1 = yarnVersion.stdout.trim().startsWith('1')
                  await execa('yarn', [
                    'add',
                    '-D',
                    ...(isYarnV1 ? ['-W'] : []),
                    ...projectPackages,
                  ])
                },
              },
            ],
            { rendererOptions: { collapseSubtasks: false } }
          )
        },
      },
      {
        title: 'Installing web side packages...',
        skip: () => !install,
        task: () => {
          return new Listr(
            [
              {
                title: `Install ${webWorkspacePackages.join(', ')}`,
                task: async () => {
                  await execa('yarn', [
                    'workspace',
                    'web',
                    'add',
                    '-D',
                    ...webWorkspacePackages,
                  ])
                },
              },
            ],
            { rendererOptions: { collapseSubtasks: false } }
          )
        },
      },
      {
        title: 'Configuring PostCSS...',
        task: () => {
          /**
           * Check if PostCSS config already exists.
           * If it exists, throw an error.
           */
          const postCSSConfigPath = rwPaths.web.postcss

          if (!force && fs.existsSync(postCSSConfigPath)) {
            throw new Error(
              'PostCSS config already exists.\nUse --force to override existing config.'
            )
          } else {
            const postCSSConfig = fs.readFileSync(
              path.join(__dirname, '../templates/postcss.config.js.template'),
              'utf-8'
            )

            return outputFileSync(postCSSConfigPath, postCSSConfig)
          }
        },
      },
      {
        title: 'Initializing Tailwind CSS...',
        task: async () => {
          const tailwindConfigPath = path.join(
            rwPaths.web.config,
            'tailwind.config.js'
          )

          if (fs.existsSync(tailwindConfigPath)) {
            if (force) {
              // `yarn tailwindcss init` will fail if these files already exists
              fs.unlinkSync(tailwindConfigPath)
            } else {
              throw new Error(
                'Tailwindcss config already exists.\nUse --force to override existing config.'
              )
            }
          }

          await execa('yarn', ['tailwindcss', 'init', tailwindConfigPath], {
            cwd: rwPaths.web.base,
          })

          // Replace `content`.
          const tailwindConfig = fs.readFileSync(tailwindConfigPath, 'utf-8')
          const newTailwindConfig = tailwindConfig.replace(
            'content: []',
            isTypeScriptProject()
              ? "content: ['src/**/*.{ts,tsx}']"
              : "content: ['src/**/*.{js,jsx}']"
          )
          fs.writeFileSync(tailwindConfigPath, newTailwindConfig)
        },
      },
      {
        title: 'Adding directives to index.css...',
        task: (_ctx, task) => {
          const INDEX_CSS_PATH = path.join(rwPaths.web.src, 'index.css')
          const indexCSS = fs.readFileSync(INDEX_CSS_PATH, 'utf-8')

          if (tailwindDirectivesExist(indexCSS)) {
            task.skip('Directives already exist in index.css')
          } else {
            const newIndexCSS = tailwindImportsAndNotes.join('\n') + indexCSS
            fs.writeFileSync(INDEX_CSS_PATH, newIndexCSS)
          }
        },
      },
      {
        title: 'Recommending VS Code extensions to install...',
        task: async (_ctx, task) => {
          if (!usingVSCode()) {
            task.skip("Looks like your're not using VS Code")
            return
          }

          const { stdout } = await execa('code', ['--list-extensions'])

          let foundRecommendation = false

          recommendedVSCodeExtensions.forEach((extension) => {
            if (!stdout.includes(extension)) {
              foundRecommendation = true
              task.output += recommendationTexts[extension] + '\n'
            }
          })

          if (!foundRecommendation) {
            task.skip('All recommended extensions are already installed')
          }
        },
        options: {
          persistentOutput: true,
        },
      },
      {
        title: 'Adding recommended VS Code extensions to project settings...',
        task: (_ctx, task) => {
          const VS_CODE_EXTENSIONS_PATH = path.join(
            rwPaths.base,
            '.vscode/extensions.json'
          )

          if (!usingVSCode()) {
            task.skip("Looks like your're not using VS Code")
          } else {
            let originalExtensionsJson = { recommendations: [] }
            if (fs.existsSync(VS_CODE_EXTENSIONS_PATH)) {
              const originalExtensionsFile = fs.readFileSync(
                VS_CODE_EXTENSIONS_PATH,
                'utf-8'
              )
              originalExtensionsJson = JSON.parse(originalExtensionsFile)
            }
            const newExtensionsJson = {
              ...originalExtensionsJson,
              recommendations: [
                ...originalExtensionsJson.recommendations,
                ...recommendedVSCodeExtensions,
              ],
            }
            fs.writeFileSync(
              VS_CODE_EXTENSIONS_PATH,
              JSON.stringify(newExtensionsJson, null, 2)
            )
          }
        },
      },
      {
        title: 'Adding tailwind config entry in prettier...',
        task: async (_ctx) => {
          const prettierConfigPath = path.join(
            rwPaths.base,
            'prettier.config.js'
          )
          // Add tailwindcss ordering plugin to prettier
          const prettierConfig = fs.readFileSync(prettierConfigPath, 'utf-8')
          const tailwindConfigPath = path
            .relative(
              rwPaths.base,
              path.posix.join(rwPaths.web.config, 'tailwind.config.js')
            )
            .replaceAll('\\', '/')

          let newPrettierConfig = prettierConfig
          if (newPrettierConfig.includes('tailwindConfig: ')) {
            if (force) {
              newPrettierConfig = newPrettierConfig.replace(
                /tailwindConfig: .*(,)?/,
                `tailwindConfig: './${tailwindConfigPath}',`
              )
            } else {
              throw new Error(
                'tailwindConfig setting already exists in prettier configuration.\nUse --force to override existing config.'
              )
            }
          } else {
            newPrettierConfig = newPrettierConfig.replace(
              /,(\n\s*)(\}\n?)$/,
              `,\n  tailwindConfig: './${tailwindConfigPath}',$1$2`
            )
          }

          fs.writeFileSync(prettierConfigPath, newPrettierConfig)
        },
      },
      {
        title: 'Adding tailwind prettier plugin...',
        task: async (_ctx, task) => {
          const prettierConfigPath = path.join(
            rwPaths.base,
            'prettier.config.js'
          )
          // Add tailwindcss ordering plugin to prettier
          const prettierConfig = fs.readFileSync(prettierConfigPath, 'utf-8')

          let newPrettierConfig = prettierConfig
          if (newPrettierConfig.includes('plugins: [')) {
            const pluginsMatch = newPrettierConfig.match(
              /plugins: \[[\sa-z\(\)'\-,]*]/
            )

            const matched = pluginsMatch && pluginsMatch[0]

            if (
              matched &&
              (matched.includes("require('prettier-plugin-tailwindcss')") ||
                matched.includes('require("prettier-plugin-tailwindcss")'))
            ) {
              task.skip(
                'tailwindcss-plugin-prettier already required in plugins'
              )
            } else {
              newPrettierConfig = newPrettierConfig.replace(
                /plugins: \[(\n\s+)*/,
                `plugins: [$1require('prettier-plugin-tailwindcss'),$1`
              )
            }
          } else {
            newPrettierConfig = newPrettierConfig.replace(
              /,(\n\s*)(\}\n?)$/,
              `,\n  plugins: [require('prettier-plugin-tailwindcss')],$1$2`
            )
          }

          fs.writeFileSync(prettierConfigPath, newPrettierConfig)
        },
      },
    ],
    { rendererOptions: { collapseSubtasks: false } }
  )

  try {
    await tasks.run()
  } catch (e) {
    errorTelemetry(process.argv, e.message)
    console.error(c.error(e.message))
    process.exit(e?.exitCode || 1)
  }
}
