import path from 'path'

import chalk from 'chalk'
import fs from 'fs-extra'

import { getCompatibilityData } from '@redwoodjs/cli-helpers'

import { installModule, isModuleInstalled } from './packages'

import { getPaths } from './index'

const { Select } = require('enquirer')

/**
 * The file inside .redwood which will contain cached plugin command mappings
 */
export const PLUGIN_CACHE_FILENAME = 'commandCache.json'

/**
 * A cache of yargs information for redwood commands that are available from plugins.
 *
 * This is intended to be used for commands which lazy install their dependencies so that
 * this information otherwise would not be available and help output would be unavailable/
 * incorrect.
 */
export const PLUGIN_CACHE_DEFAULT = {
  '@redwoodjs/cli-storybook-vite': {
    storybook: {
      aliases: ['sb'],
      description:
        'Launch Storybook: a tool for building UI components and pages in isolation',
    },
  },
  '@redwoodjs/cli-data-migrate': {
    'data-migrate <command>': {
      aliases: ['dataMigrate', 'dm'],
      description: 'Migrate the data in your database',
    },
  },
}

/**
 * A list of commands that are built into the CLI and require no plugin to be loaded.
 */
export const PLUGIN_CACHE_BUILTIN = [
  'build',
  'check',
  'diagnostics',
  'console',
  'c',
  'deploy',
  'destroy',
  'd',
  'dev',
  'exec',
  'experimental',
  'exp',
  'generate',
  'g',
  'info',
  'lint',
  'prerender',
  'render',
  'prisma',
  'record',
  'serve',
  'setup',
  'test',
  'ts-to-js',
  'type-check',
  'tsc',
  'tc',
  'upgrade',
]

export function loadCommandCache() {
  // Always default to the default cache
  let pluginCommandCache = PLUGIN_CACHE_DEFAULT
  const commandCachePath = path.join(
    getPaths().generated.base,
    PLUGIN_CACHE_FILENAME,
  )
  try {
    const localCommandCache = JSON.parse(fs.readFileSync(commandCachePath))
    // This validity check is rather naive but it exists to invalidate a
    // previous format of the cache file
    let valid = true
    for (const [key, value] of Object.entries(localCommandCache)) {
      if (key === '_builtin') {
        continue
      }
      valid &&= !Array.isArray(value)
    }
    if (valid) {
      // Merge the default cache with the local cache but ensure the default
      // cache takes precedence - this ensure the cache is consistent with the
      // current version of the framework
      pluginCommandCache = {
        ...localCommandCache,
        ...PLUGIN_CACHE_DEFAULT,
      }
    }
  } catch (error) {
    // If the cache file doesn't exist we can just ignore it and continue
    if (error.code !== 'ENOENT') {
      console.error(`Error loading plugin command cache at ${commandCachePath}`)
      console.error(error)
    }
  }
  // Built in commands must be in sync with the framework code
  pluginCommandCache._builtin = PLUGIN_CACHE_BUILTIN
  return pluginCommandCache
}

export function saveCommandCache(pluginCommandCache) {
  const commandCachePath = path.join(
    getPaths().generated.base,
    PLUGIN_CACHE_FILENAME,
  )
  try {
    fs.writeFileSync(
      commandCachePath,
      JSON.stringify(pluginCommandCache, undefined, 2),
    )
  } catch (error) {
    console.error(`Error saving plugin command cache at ${commandCachePath}`)
    console.error(error)
  }
}

/**
 * Logs warnings for any plugins that have invalid definitions in the redwood.toml file
 *
 * @param {any[]} plugins An array of plugin objects read from the redwood.toml file
 */
export function checkPluginListAndWarn(plugins) {
  // Plugins must define a package
  for (const plugin of plugins) {
    if (!plugin.package) {
      console.warn(
        chalk.yellow(`⚠️  A plugin is missing a package, it cannot be loaded.`),
      )
    }
  }

  // Plugins should only occur once in the list
  const pluginPackages = plugins
    .map((p) => p.package)
    .filter((p) => p !== undefined)
  if (pluginPackages.length !== new Set(pluginPackages).size) {
    console.warn(
      chalk.yellow(
        '⚠️  Duplicate plugin packages found in redwood.toml, duplicates will be ignored.',
      ),
    )
  }

  // Plugins should be published to npm under a scope which is used as the namespace
  const namespaces = plugins.map((p) => p.package?.split('/')[0])
  namespaces.forEach((ns) => {
    if (ns !== undefined && !ns.startsWith('@')) {
      console.warn(
        chalk.yellow(
          `⚠️  Plugin "${ns}" is missing a scope/namespace, it will not be loaded.`,
        ),
      )
    }
  })
}

/**
 * Attempts to load a plugin package and return it. Returns null if the plugin failed to load.
 *
 * @param {string} packageName The npm package name of the plugin
 * @param {string | undefined} packageVersion The npm package version of the plugin, defaults to loading the plugin at the
 * same version as the cli
 * @param {boolean} autoInstall Whether to automatically install the plugin package if it is not installed already
 * @returns The plugin package or null if it failed to load
 */
export async function loadPluginPackage(
  packageName,
  packageVersion,
  autoInstall,
) {
  // NOTE: This likely does not handle mismatch versions between what is installed and what is requested
  if (isModuleInstalled(packageName)) {
    return await import(packageName)
  }

  if (!autoInstall) {
    console.warn(
      chalk.yellow(
        `⚠️  Plugin "${packageName}" cannot be loaded because it is not installed and "autoInstall" is disabled.`,
      ),
    )
    return null
  }

  // Attempt to install the plugin
  console.log(chalk.green(`Installing plugin "${packageName}"...`))
  const installed = await installPluginPackage(packageName, packageVersion)
  if (installed) {
    return await import(packageName)
  }
  return null
}

/**
 * Attempts to install a plugin package. Installs the package as a dev dependency.
 *
 * @param {string} packageName The npm package name of the plugin
 * @param {string} packageVersion The npm package version of the plugin to install or undefined
 * to install the same version as the cli
 * @returns True if the plugin was installed successfully, false otherwise
 */
async function installPluginPackage(packageName, packageVersion) {
  // We use a simple heuristic here to try and be a little more convenient for the user
  // when no version is specified.

  let versionToInstall = packageVersion
  const isRedwoodPackage = packageName.startsWith('@redwoodjs/')
  if (!isRedwoodPackage && versionToInstall === undefined) {
    versionToInstall = 'latest'
    try {
      const compatibilityData = await getCompatibilityData(
        packageName,
        versionToInstall,
      )
      versionToInstall = compatibilityData.compatible.version
      console.log(
        chalk.green(
          `Installing the latest compatible version: ${versionToInstall}`,
        ),
      )
    } catch (error) {
      console.log(
        'The following error occurred while checking plugin compatibility for automatic installation:',
      )
      const errorMessage = error.message ?? error
      console.log(errorMessage)

      // Exit without a chance to continue if it makes sense to do so
      if (
        errorMessage.includes('does not have a tag') ||
        errorMessage.includes('does not have a version')
      ) {
        process.exit(1)
      }

      const prompt = new Select({
        name: 'versionDecision',
        message: 'What would you like to do?',
        choices: [
          {
            name: 'cancel',
            message: 'Cancel',
          },
          {
            name: 'continue',
            message: "Continue and install the 'latest' version",
          },
        ],
      })
      const decision = await prompt.run()
      if (decision === 'cancel') {
        process.exit(1)
      }
    }
  }

  try {
    // Note that installModule does the cli version matching for us if versionToInstall is undefined
    await installModule(packageName, versionToInstall)
    return true
  } catch (error) {
    console.error(error)
    return false
  }
}
