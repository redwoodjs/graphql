import * as fs from 'node:fs'
import * as path from 'node:path'

import dotenv from 'dotenv'
import * as toml from 'smol-toml'

import type { Config } from '@redwoodjs/project-config'
import {
  findUp,
  getConfigPath,
  getConfig,
  resolveFile,
} from '@redwoodjs/project-config'

import { colors } from './colors.js'
import { getPaths } from './paths.js'

export const getGraphqlPath = () => {
  return resolveFile(path.join(getPaths().api.functions, 'graphql'))
}

export const graphFunctionDoesExist = () => {
  const graphqlPath = getGraphqlPath()
  return graphqlPath && fs.existsSync(graphqlPath)
}

export const isTypeScriptProject = () => {
  const paths = getPaths()
  return (
    fs.existsSync(path.join(paths.web.base, 'tsconfig.json')) ||
    fs.existsSync(path.join(paths.api.base, 'tsconfig.json'))
  )
}

export const getInstalledRedwoodVersion = () => {
  try {
    const packageJson = require('../../package.json')
    return packageJson.version
  } catch {
    console.error(colors.error('Could not find installed redwood version'))
    process.exit(1)
  }
}

/**
 * Updates the project's redwood.toml file to include the specified packages plugin
 *
 * Uses toml parsing to determine if the plugin is already included in the file and
 * only adds it if it is not.
 *
 * Writes the updated config to the file system by appending strings, not stringify-ing the toml.
 */
export const updateTomlConfig = (packageName: string) => {
  const redwoodTomlPath = getConfigPath()
  const originalTomlContent = fs.readFileSync(redwoodTomlPath, 'utf-8')

  let tomlToAppend: Record<string, toml.TomlPrimitive> = {}

  const config = getConfig(redwoodTomlPath)

  const cliSection = config.experimental?.cli

  if (!cliSection) {
    tomlToAppend = {
      experimental: {
        cli: {
          autoInstall: true,
          plugins: [{ package: packageName, enabled: true }],
        },
      },
    }
  } else if (cliSection.plugins) {
    const packageExists = cliSection.plugins.some(
      (plugin) => plugin.package === packageName,
    )

    if (!packageExists) {
      tomlToAppend = {
        experimental: {
          cli: {
            plugins: [{ package: packageName, enabled: true }],
          },
        },
      }
    }
  } else {
    tomlToAppend = {
      experimental: {
        cli: {
          plugins: [{ package: packageName, enabled: true }],
        },
      },
    }
  }

  const newConfig =
    originalTomlContent +
    '\n' +
    (Object.keys(tomlToAppend).length > 0
      ? toml.stringify(tomlToAppend) + '\n'
      : '')

  return fs.writeFileSync(redwoodTomlPath, newConfig, 'utf-8')
}

export const updateTomlConfigTask = (packageName: string) => {
  return {
    title: `Updating redwood.toml to configure ${packageName} ...`,
    task: () => {
      updateTomlConfig(packageName)
    },
  }
}

export const addEnvVarTask = (name: string, value: string, comment: string) => {
  return {
    title: `Adding ${name} var to .env...`,
    task: () => {
      addEnvVar(name, value, comment)
    },
  }
}

export const addEnvVar = (name: string, value: string, comment: string) => {
  const envPath = path.join(getPaths().base, '.env')
  let envFile = ''
  const newEnvironmentVariable = [
    comment && `# ${comment}`,
    `${name}=${value}`,
    '',
  ]
    .flat()
    .join('\n')

  if (fs.existsSync(envPath)) {
    envFile = fs.readFileSync(envPath).toString()
    const existingEnvVars = dotenv.parse(envFile)

    if (existingEnvVars[name] && existingEnvVars[name] === value) {
      return envFile
    }

    if (existingEnvVars[name]) {
      const p = [
        `# Note: The existing environment variable ${name} was not overwritten. Uncomment to use its new value.`,
        comment && `# ${comment}`,
        `# ${name}=${value}`,
        '',
      ]
        .flat()
        .join('\n')
      envFile += '\n' + p
    } else {
      envFile += '\n' + newEnvironmentVariable
    }
  } else {
    envFile = newEnvironmentVariable
  }

  return fs.writeFileSync(envPath, envFile)
}

/**
 * This sets the `RWJS_CWD` env var to the redwood project directory. This is typically required for internal
 * redwood packages to work correctly. For example, `@redwoodjs/project-config` uses this when reading config
 * or paths.
 *
 * @param cwd Explicitly set the redwood cwd. If not set, we'll try to determine it automatically. You likely
 * only want to set this based on some specific input, like a CLI flag.
 */
export const setRedwoodCWD = (cwd?: string) => {
  // Get the existing `cwd` from the `RWJS_CWD` env var, if it exists.
  cwd ??= process.env.RWJS_CWD

  if (cwd) {
    // `cwd` was specifically passed in or the `RWJS_CWD` env var. In this case,
    // we don't want to find up for a `redwood.toml` file. The `redwood.toml` should just be in that directory.
    if (!fs.existsSync(path.join(cwd, 'redwood.toml'))) {
      throw new Error(`Couldn't find a "redwood.toml" file in ${cwd}`)
    }
  } else {
    // `cwd` wasn't set. Odds are they're in a Redwood project,
    // but they could be in ./api or ./web, so we have to find up to be sure.
    const redwoodTOMLPath = findUp('redwood.toml', process.cwd())
    if (!redwoodTOMLPath) {
      throw new Error(
        `Couldn't find up a "redwood.toml" file from ${process.cwd()}`,
      )
    }
    if (redwoodTOMLPath) {
      cwd = path.dirname(redwoodTOMLPath)
    }
  }

  process.env.RWJS_CWD = cwd
}

/**
 * Create or update the given setting, in the given section, with the given value.
 *
 * If the section already exists it adds the new setting last
 * If the section, and the setting, already exists, the setting is updated
 * If the section does not exist it is created at the end of the file and the setting is added
 * If the setting exists in the section, but is commented out, it will be uncommented and updated
 */
export function setTomlSetting(
  section: keyof Config,
  setting: string,
  value: string | boolean | number,
) {
  const redwoodTomlPath = getConfigPath()
  const originalTomlContent = fs.readFileSync(redwoodTomlPath, 'utf-8')

  const redwoodTomlObject = toml.parse(originalTomlContent)
  const sectionValue = redwoodTomlObject[section]

  const existingValue =
    // I don't like this type cast, but I couldn't come up with a much better
    // solution
    (sectionValue as Record<string, toml.TomlPrimitive> | undefined)?.[setting]

  // If the setting already exists in the given section, and has the given
  // value already, just return
  if (existingValue === value) {
    return
  }

  // By default we create the new section at the end of the file, and set the
  // new value for the given setting. If the section already exists, we'll
  // disregard this update and use the existing section instead
  let newTomlContent =
    originalTomlContent.replace(/\n$/, '') +
    `\n\n[${section}]\n  ${setting} = ${value}`

  const hasExistingSettingSection = !!redwoodTomlObject?.[section]

  if (hasExistingSettingSection) {
    const existingSectionSettings = Object.keys(redwoodTomlObject[section])

    let inSection = false
    let indentation = ''
    let insertionIndex = 1
    let updateExistingValue = false
    let updateExistingCommentedValue = false

    const tomlLines = originalTomlContent.split('\n')

    // Loop over all lines looking for either the given setting in the given
    // section (preferred), or the given setting, but commented out, in the
    // given section
    tomlLines.forEach((line: string, index) => {
      // Assume all sections start with [sectionName] un-indented. This might
      // prove to be too simplistic, but it's all we support right now. Feel
      // free to add support for more complicated scenarios as needed.
      if (line.startsWith(`[${section}]`)) {
        inSection = true
        insertionIndex = index + 1
      } else {
        // The section ends as soon as we find a line that starts with a [
        if (/^\s*\[/.test(line)) {
          inSection = false
        }

        // If we're in the section, and we haven't found the setting yet, keep
        // looking
        if (inSection && !updateExistingValue) {
          for (const existingSectionSetting of existingSectionSettings) {
            const matches = line.match(
              new RegExp(`^(\\s*)${existingSectionSetting}\\s*=`, 'i'),
            )

            if (!updateExistingValue && matches) {
              if (!updateExistingCommentedValue) {
                indentation = matches[1]
              }

              if (existingSectionSetting === setting) {
                updateExistingValue = true
                insertionIndex = index
                indentation = matches[1]
              }
            }

            // As long as we find existing settings in the section we keep
            // pushing the insertion index forward, unless we've already found
            // an existing setting that matches the one we're adding.
            if (
              !updateExistingValue &&
              !updateExistingCommentedValue &&
              /^\s*\w+\s*=/.test(line)
            ) {
              insertionIndex = index + 1
            }
          }

          // If we haven't found an existing value to update, see if we can
          // find a commented value instead
          if (!updateExistingValue) {
            const matchesComment = line.match(
              new RegExp(`^(\\s*)#(\\s*)${setting}\\s*=`, 'i'),
            )

            if (matchesComment) {
              const commentIndentation =
                matchesComment[1].length > matchesComment[2].length
                  ? matchesComment[1]
                  : matchesComment[2]

              if (commentIndentation.length - 1 > indentation.length) {
                indentation = commentIndentation
              }

              updateExistingCommentedValue = true
              insertionIndex = index
            }
          }
        }
      }
    })

    tomlLines.splice(
      insertionIndex,
      updateExistingValue || updateExistingCommentedValue ? 1 : 0,
      `${indentation}${setting} = ${value}`,
    )

    newTomlContent = tomlLines.join('\n')
  }

  fs.writeFileSync(redwoodTomlPath, newTomlContent)
}
