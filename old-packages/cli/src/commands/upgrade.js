import path from 'path'

import { ListrEnquirerPromptAdapter } from '@listr2/prompt-adapter-enquirer'
import execa from 'execa'
import fs from 'fs-extra'
import latestVersion from 'latest-version'
import { Listr } from 'listr2'
import terminalLink from 'terminal-link'

import { recordTelemetryAttributes } from '@redwoodjs/cli-helpers'
import { getConfig } from '@redwoodjs/project-config'

import { getPaths } from '../lib'
import c from '../lib/colors'
import { generatePrismaClient } from '../lib/generatePrismaClient'
import { PLUGIN_CACHE_FILENAME } from '../lib/plugin'

export const command = 'upgrade'
export const description = 'Upgrade all @redwoodjs packages via interactive CLI'

export const builder = (yargs) => {
  yargs
    .example(
      'rw upgrade -t 0.20.1-canary.5',
      'Specify a version. URL for Version History:\nhttps://www.npmjs.com/package/@redwoodjs/core',
    )
    .option('dry-run', {
      alias: 'd',
      description: 'Check for outdated packages without upgrading',
      type: 'boolean',
    })
    .option('tag', {
      alias: 't',
      description:
        '[choices: "latest", "rc", "next", "canary", "experimental", or a specific-version (see example below)] WARNING: "canary", "rc" and "experimental" are unstable releases! And "canary" releases include breaking changes often requiring codemods if upgrading a project.',
      requiresArg: true,
      type: 'string',
      coerce: validateTag,
    })
    .option('verbose', {
      alias: 'v',
      description: 'Print verbose logs',
      type: 'boolean',
      default: false,
    })
    .option('dedupe', {
      description: 'Skip dedupe check with --no-dedupe',
      type: 'boolean',
      default: true,
    })
    .option('yes', {
      alias: 'y',
      describe: 'Skip prompts and use defaults',
      default: false,
      type: 'boolean',
    })
    .epilogue(
      `Also see the ${terminalLink(
        'Redwood CLI Reference for the upgrade command',
        'https://redwoodjs.com/docs/cli-commands#upgrade',
      )}.\nAnd the ${terminalLink(
        'GitHub releases page',
        'https://github.com/redwoodjs/redwood/releases',
      )} for more information on the current release.`,
    )
}

// Used in yargs builder to coerce tag AND to parse yarn version
const SEMVER_REGEX =
  /(?<=^v?|\sv?)(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-(?:0|[1-9]\d*|[\da-z-]*[a-z-][\da-z-]*)(?:\.(?:0|[1-9]\d*|[\da-z-]*[a-z-][\da-z-]*))*)?(?:\+[\da-z-]+(?:\.[\da-z-]+)*)?(?=$|\s)/i

const isValidSemver = (string) => {
  return SEMVER_REGEX.test(string)
}

const isValidRedwoodJSTag = (tag) => {
  return ['rc', 'canary', 'latest', 'next', 'experimental'].includes(tag)
}

export const validateTag = (tag) => {
  const isTagValid = isValidSemver(tag) || isValidRedwoodJSTag(tag)

  if (!isTagValid) {
    // Stop execution
    throw new Error(
      c.error(
        "Invalid tag supplied. Supported values: 'rc', 'canary', 'latest', 'next', 'experimental', or a valid semver version\n",
      ),
    )
  }

  return tag
}

export const handler = async ({ dryRun, tag, verbose, dedupe, yes }) => {
  recordTelemetryAttributes({
    command: 'upgrade',
    dryRun,
    tag,
    verbose,
    dedupe,
    yes,
  })

  // structuring as nested tasks to avoid bug with task.title causing duplicates
  const tasks = new Listr(
    [
      {
        title: 'Confirm upgrade',
        task: async (ctx, task) => {
          if (yes) {
            task.skip('Skipping confirmation prompt because of --yes flag.')
            return
          }

          const prompt = task.prompt(ListrEnquirerPromptAdapter)
          const proceed = await prompt.run({
            type: 'Confirm',
            message:
              'This will upgrade your RedwoodJS project to the latest version. Do you want to proceed?',
            initial: 'Y',
            default: '(Yes/no)',
            format: function (value) {
              if (this.state.submitted) {
                return this.isTrue(value) ? 'yes' : 'no'
              }

              return 'Yes'
            },
          })

          if (!proceed) {
            task.skip('Upgrade cancelled by user.')
            process.exit(0)
          }
        },
      },
      {
        title: 'Checking latest version',
        task: async (ctx) => setLatestVersionToContext(ctx, tag),
      },
      {
        title: 'Updating your Redwood version',
        task: (ctx) => updateRedwoodDepsForAllSides(ctx, { dryRun, verbose }),
        enabled: (ctx) => !!ctx.versionToUpgradeTo,
      },
      {
        title: 'Updating other packages in your package.json(s)',
        task: (ctx) =>
          updatePackageVersionsFromTemplate(ctx, { dryRun, verbose }),
        enabled: (ctx) => ctx.versionToUpgradeTo?.includes('canary'),
      },
      {
        title: 'Downloading yarn patches',
        task: (ctx) => downloadYarnPatches(ctx, { dryRun, verbose }),
        enabled: (ctx) => ctx.versionToUpgradeTo?.includes('canary'),
      },
      {
        title: 'Removing CLI cache',
        task: (ctx) => removeCliCache(ctx, { dryRun, verbose }),
      },
      {
        title: 'Running yarn install',
        task: (ctx) => yarnInstall(ctx, { dryRun, verbose }),
        skip: () => dryRun,
      },
      {
        title: 'Refreshing the Prisma client',
        task: (_ctx, task) => refreshPrismaClient(task, { verbose }),
        skip: () => dryRun,
      },
      {
        title: 'De-duplicating dependencies',
        skip: () => dryRun || !dedupe,
        task: (_ctx, task) => dedupeDeps(task, { verbose }),
      },
      {
        title: 'One more thing..',
        task: (ctx, task) => {
          const version = ctx.versionToUpgradeTo
          const messageSections = [
            `One more thing...\n\n   ${c.warning(
              `🎉 Your project has been upgraded to RedwoodJS ${version}!`,
            )} \n\n`,
          ]
          // Show links when switching to 'latest' or 'rc', undefined is essentially an alias of 'latest'
          if ([undefined, 'latest', 'rc'].includes(tag)) {
            messageSections.push(
              `   Please review the release notes for any manual steps: \n   ❖ ${terminalLink(
                `Redwood community discussion`,
                `https://community.redwoodjs.com/c/announcements/releases-and-upgrade-guides/`,
              )}\n   ❖ ${terminalLink(
                `GitHub Release notes`,
                `https://github.com/redwoodjs/redwood/releases`, // intentionally not linking to specific version
              )} \n\n`,
            )
          }
          // @MARK
          // This should be temporary and eventually superseded by a more generic notification system
          if (tag) {
            const additionalMessages = []
            // Reminder to update the `notifications.versionUpdates` TOML option
            if (
              !getConfig().notifications.versionUpdates.includes(tag) &&
              isValidRedwoodJSTag(tag)
            ) {
              additionalMessages.push(
                `   ❖ You may want to update your redwood.toml config so that \`notifications.versionUpdates\` includes "${tag}"\n`,
              )
            }
            // Append additional messages with a header
            if (additionalMessages.length > 0) {
              messageSections.push(
                `   📢 ${c.warning(`We'd also like to remind you that:`)} \n`,
                ...additionalMessages,
              )
            }
          }
          task.title = messageSections.join('').trimEnd()
        },
      },
    ],
    {
      renderer: verbose ? 'verbose' : 'default',
      rendererOptions: { collapseSubtasks: false },
    },
  )

  await tasks.run()
}
async function yarnInstall({ verbose }) {
  const yarnVersion = await getCmdMajorVersion('yarn')

  try {
    await execa(
      'yarn install',
      yarnVersion > 1 ? [] : ['--force', '--non-interactive'],
      {
        shell: true,
        stdio: verbose ? 'inherit' : 'pipe',

        cwd: getPaths().base,
      },
    )
  } catch (e) {
    throw new Error(
      'Could not finish installation. Please run `yarn install` and then `yarn dedupe`, before continuing',
    )
  }
}

/**
 * Removes the CLI plugin cache. This prevents the CLI from using outdated versions of the plugin,
 * when the plugins share the same alias. e.g. `rw sb` used to point to `@redwoodjs/cli-storybook` but now points to `@redwoodjs/cli-storybook-vite`
 */
async function removeCliCache(ctx, { dryRun, verbose }) {
  const cliCacheDir = path.join(
    getPaths().generated.base,
    PLUGIN_CACHE_FILENAME,
  )

  if (verbose) {
    console.log('Removing CLI cache at: ', cliCacheDir)
  }

  if (!dryRun) {
    fs.removeSync(cliCacheDir)
  }
}

async function setLatestVersionToContext(ctx, tag) {
  try {
    const foundVersion = await latestVersion(
      '@redwoodjs/core',
      tag ? { version: tag } : {},
    )

    ctx.versionToUpgradeTo = foundVersion
    return foundVersion
  } catch (e) {
    throw new Error('Could not find the latest version')
  }
}

/**
 * Iterates over Redwood dependencies in package.json files and updates the version.
 */
function updatePackageJsonVersion(pkgPath, version, { dryRun, verbose }) {
  const pkg = JSON.parse(
    fs.readFileSync(path.join(pkgPath, 'package.json'), 'utf-8'),
  )

  if (pkg.dependencies) {
    for (const depName of Object.keys(pkg.dependencies).filter(
      (x) => x.startsWith('@redwoodjs/') && x !== '@redwoodjs/studio',
    )) {
      if (verbose || dryRun) {
        console.log(` - ${depName}: ${pkg.dependencies[depName]} => ${version}`)
      }
      pkg.dependencies[depName] = `${version}`
    }
  }
  if (pkg.devDependencies) {
    for (const depName of Object.keys(pkg.devDependencies).filter(
      (x) => x.startsWith('@redwoodjs/') && x !== '@redwoodjs/studio',
    )) {
      if (verbose || dryRun) {
        console.log(
          ` - ${depName}: ${pkg.devDependencies[depName]} => ${version}`,
        )
      }
      pkg.devDependencies[depName] = `${version}`
    }
  }

  if (!dryRun) {
    fs.writeFileSync(
      path.join(pkgPath, 'package.json'),
      JSON.stringify(pkg, undefined, 2),
    )
  }
}

function updateRedwoodDepsForAllSides(ctx, options) {
  if (!ctx.versionToUpgradeTo) {
    throw new Error('Failed to upgrade')
  }

  const updatePaths = [
    getPaths().base,
    getPaths().api.base,
    getPaths().web.base,
  ]

  return new Listr(
    updatePaths.map((basePath) => {
      const pkgJsonPath = path.join(basePath, 'package.json')
      return {
        title: `Updating ${pkgJsonPath}`,
        task: () =>
          updatePackageJsonVersion(basePath, ctx.versionToUpgradeTo, options),
        skip: () => !fs.existsSync(pkgJsonPath),
      }
    }),
  )
}

async function updatePackageVersionsFromTemplate(ctx, { dryRun, verbose }) {
  if (!ctx.versionToUpgradeTo) {
    throw new Error('Failed to upgrade')
  }

  const packageJsons = [
    {
      basePath: getPaths().base,
      url: 'https://raw.githubusercontent.com/redwoodjs/redwood/main/packages/create-redwood-app/templates/ts/package.json',
    },
    {
      basePath: getPaths().api.base,
      url: 'https://raw.githubusercontent.com/redwoodjs/redwood/main/packages/create-redwood-app/templates/ts/api/package.json',
    },
    {
      basePath: getPaths().web.base,
      url: 'https://raw.githubusercontent.com/redwoodjs/redwood/main/packages/create-redwood-app/templates/ts/web/package.json',
    },
  ]

  return new Listr(
    packageJsons.map(({ basePath, url }) => {
      const pkgJsonPath = path.join(basePath, 'package.json')

      return {
        title: `Updating ${pkgJsonPath}`,
        task: async () => {
          const res = await fetch(url)
          const text = await res.text()
          const templatePackageJson = JSON.parse(text)

          const localPackageJsonText = fs.readFileSync(pkgJsonPath, 'utf-8')
          const localPackageJson = JSON.parse(localPackageJsonText)

          Object.entries(templatePackageJson.dependencies || {}).forEach(
            ([depName, depVersion]) => {
              // Redwood packages are handled in another task
              if (!depName.startsWith('@redwoodjs/')) {
                if (verbose || dryRun) {
                  console.log(
                    ` - ${depName}: ${localPackageJson.dependencies[depName]} => ${depVersion}`,
                  )
                }

                localPackageJson.dependencies[depName] = depVersion
              }
            },
          )

          Object.entries(templatePackageJson.devDependencies || {}).forEach(
            ([depName, depVersion]) => {
              // Redwood packages are handled in another task
              if (!depName.startsWith('@redwoodjs/')) {
                if (verbose || dryRun) {
                  console.log(
                    ` - ${depName}: ${localPackageJson.devDependencies[depName]} => ${depVersion}`,
                  )
                }

                localPackageJson.devDependencies[depName] = depVersion
              }
            },
          )

          if (!dryRun) {
            fs.writeFileSync(
              pkgJsonPath,
              JSON.stringify(localPackageJson, null, 2),
            )
          }
        },
        skip: () => !fs.existsSync(pkgJsonPath),
      }
    }),
  )
}

async function downloadYarnPatches(ctx, { dryRun, verbose }) {
  if (!ctx.versionToUpgradeTo) {
    throw new Error('Failed to upgrade')
  }

  const githubToken =
    process.env.GH_TOKEN ||
    process.env.GITHUB_TOKEN ||
    process.env.REDWOOD_GITHUB_TOKEN

  const res = await fetch(
    'https://api.github.com/repos/redwoodjs/redwood/git/trees/main?recursive=1',
    {
      headers: {
        Authorization: githubToken ? `Bearer ${githubToken}` : undefined,
        ['X-GitHub-Api-Version']: '2022-11-28',
        Accept: 'application/vnd.github+json',
      },
    },
  )

  const json = await res.json()
  const patches = json.tree?.filter((patchInfo) =>
    patchInfo.path.startsWith(
      'packages/create-redwood-app/templates/ts/.yarn/patches/',
    ),
  )

  const patchDir = path.join(getPaths().base, '.yarn', 'patches')

  if (verbose) {
    console.log('Creating patch directory', patchDir)
  }

  if (!dryRun) {
    fs.mkdirSync(patchDir, { recursive: true })
  }

  return new Listr(
    (patches || []).map((patch) => {
      return {
        title: `Downloading ${patch.path}`,
        task: async () => {
          const res = await fetch(patch.url)
          const patchMeta = await res.json()
          const patchPath = path.join(
            getPaths().base,
            '.yarn',
            'patches',
            path.basename(patch.path),
          )

          if (verbose) {
            console.log('Writing patch', patchPath)
          }

          if (!dryRun) {
            await fs.writeFile(patchPath, patchMeta.content, 'base64')
          }
        },
      }
    }),
  )
}

async function refreshPrismaClient(task, { verbose }) {
  /** Relates to prisma/client issue, @see: https://github.com/redwoodjs/redwood/issues/1083 */
  try {
    await generatePrismaClient({
      verbose,
      force: false,
      schema: getPaths().api.dbSchema,
    })
  } catch (e) {
    task.skip('Refreshing the Prisma client caused an Error.')
    console.log(
      'You may need to update your prisma client manually: $ yarn rw prisma generate',
    )
    console.log(c.error(e.message))
  }
}

export const getCmdMajorVersion = async (command) => {
  // Get current version
  const { stdout } = await execa(command, ['--version'], {
    cwd: getPaths().base,
  })

  if (!SEMVER_REGEX.test(stdout)) {
    throw new Error(`Unable to verify ${command} version.`)
  }

  // Get major version number
  const version = stdout.match(SEMVER_REGEX)[0]
  return parseInt(version.split('.')[0])
}

const dedupeDeps = async (task, { verbose }) => {
  try {
    const yarnVersion = await getCmdMajorVersion('yarn')

    const baseExecaArgsForDedupe = {
      shell: true,
      stdio: verbose ? 'inherit' : 'pipe',
      cwd: getPaths().base,
    }
    if (yarnVersion > 1) {
      await execa('yarn', ['dedupe'], baseExecaArgsForDedupe)
    } else {
      // Redwood projects should not be using yarn 1.x as we specify a version of yarn in the package.json
      // with "packageManager": "yarn@4.6.0" or similar.
      // Although we could (and previous did) automatically run `npx yarn-deduplicate` here, that would require
      // the user to have `npx` installed, which is not guaranteed and we do not wish to enforce that.
      task.skip(
        "Yarn 1.x doesn't support dedupe directly. Please upgrade yarn or use npx with `npx yarn-deduplicate` manually.",
      )
    }
  } catch (e) {
    console.log(c.error(e.message))
    throw new Error(
      'Could not finish de-duplication. For yarn 1.x, please run `npx yarn-deduplicate`, or for yarn >= 3 run `yarn dedupe` before continuing',
    )
  }
  await yarnInstall({ verbose })
}
