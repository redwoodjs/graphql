import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { trace, SpanStatusCode } from '@opentelemetry/api'
import checkNodeVersionCb from 'check-node-version'
import execa from 'execa'
import fs from 'fs-extra'
import semver from 'semver'
import terminalLink from 'terminal-link'
import untildify from 'untildify'
import { hideBin, Parser } from 'yargs/helpers'
import yargs from 'yargs/yargs'

import { RedwoodTUI, ReactiveTUIContent, RedwoodStyling } from '@redwoodjs/tui'

import { name, version } from '../package.json'

import {
  UID,
  startTelemetry,
  shutdownTelemetry,
  recordErrorViaTelemetry,
} from './telemetry.js'

const INITIAL_COMMIT_MESSAGE = 'Initial commit'

// Telemetry can be disabled in two ways:
// - by passing `--telemetry false`  or `--no-telemetry`
// - by setting the `REDWOOD_DISABLE_TELEMETRY` env var to `1`
const { telemetry } = Parser(hideBin(process.argv), {
  boolean: ['telemetry'],
  default: {
    telemetry:
      process.env.REDWOOD_DISABLE_TELEMETRY === undefined ||
      process.env.REDWOOD_DISABLE_TELEMETRY === '',
  },
})

const tui = new RedwoodTUI()

function isYarnBerryOrNewer() {
  const { npm_config_user_agent: npmConfigUserAgent } = process.env

  if (npmConfigUserAgent) {
    const match = npmConfigUserAgent.match(/yarn\/(\d+)/)

    if (match && match[1]) {
      return parseInt(match[1], 10) >= 2
    }
  }

  return false
}

const USE_GITPOD_TEXT = [
  `  As an alternative solution, you can launch a Redwood project using GitPod instead. GitPod is a an online IDE.`,
  `  See: ${terminalLink(
    'Launch Redwood using GitPod',
    'https://gitpod.io/#https://github.com/redwoodjs/starter',
    {
      fallback: () =>
        'Launch Redwood using GitPod https://gitpod.io/#https://github.com/redwoodjs/starter',
    },
  )}`,
]

async function executeCompatibilityCheck(templateDir) {
  const tuiContent = new ReactiveTUIContent({
    mode: 'text',
    content: 'Checking node and yarn compatibility',
    spinner: {
      enabled: true,
    },
  })
  tui.startReactive(tuiContent)

  const [checksPassed, checksData] = await checkNodeVersion(templateDir)

  if (checksPassed) {
    tuiContent.update({
      spinner: {
        enabled: false,
      },
      content: `${RedwoodStyling.green('✔')} Compatibility checks passed`,
    })
    tui.stopReactive()

    return
  }

  if (!checksPassed) {
    const foundNodeVersionIsLessThanRequired = semver.lt(
      checksData.node.version.version,
      semver.minVersion(checksData.node.wanted.raw),
    )

    if (foundNodeVersionIsLessThanRequired) {
      tui.stopReactive(true)
      tui.displayError(
        'Compatibility checks failed',
        [
          `  You need to upgrade the version of node you're using.`,
          `  You're using ${checksData.node.version.version} and we currently support node ${checksData.node.wanted.range}.`,
          '',
          `  Please use tools like nvm or corepack to change to a compatible version.`,
          `  See: ${terminalLink(
            'How to - Using nvm',
            'https://redwoodjs.com/docs/how-to/using-nvm',
            {
              fallback: () =>
                'How to - Using nvm https://redwoodjs.com/docs/how-to/using-nvm',
            },
          )}`,
          `  See: ${terminalLink(
            'Tutorial - Prerequisites',
            'https://redwoodjs.com/docs/tutorial/chapter1/prerequisites',
            {
              fallback: () =>
                'Tutorial - Prerequisites https://redwoodjs.com/docs/tutorial/chapter1/prerequisites',
            },
          )}`,
          '',
          ...USE_GITPOD_TEXT,
        ].join('\n'),
      )

      recordErrorViaTelemetry('Compatibility checks failed')
      await shutdownTelemetry()
      process.exit(1)
    }

    tui.stopReactive(true)
    tui.displayWarning(
      'Compatibility checks failed',
      [
        `  You may want to downgrade the version of node you're using.`,
        `  You're using ${checksData.node.version.version} and we currently support node ${checksData.node.wanted.range}.`,
        '',
        `  This may make your project incompatible with some deploy targets, especially those using AWS Lambdas.`,
        '',
        `  Please use tools like nvm or corepack to change to a compatible version.`,
        `  See: ${terminalLink(
          'How to - Use nvm',
          'https://redwoodjs.com/docs/how-to/using-nvm',
          {
            fallback: () =>
              'How to - Use nvm https://redwoodjs.com/docs/how-to/using-nvm',
          },
        )}`,
        `  See: ${terminalLink(
          'Tutorial - Prerequisites',
          'https://redwoodjs.com/docs/tutorial/chapter1/prerequisites',
          {
            fallback: () =>
              'Tutorial - Prerequisites https://redwoodjs.com/docs/tutorial/chapter1/prerequisites',
          },
        )}`,
        '',
        ...USE_GITPOD_TEXT,
      ].join('\n'),
    )

    // Try catch for handling if the user cancels the prompt.
    try {
      const response = await tui.prompt({
        type: 'select',
        name: 'override-engine-error',
        message: 'How would you like to proceed?',
        choices: ['Override error and continue install', 'Quit install'],
        initial: 0,
      })
      if (response['override-engine-error'] === 'Quit install') {
        recordErrorViaTelemetry('User quit after engine check error')
        await shutdownTelemetry()
        process.exit(0)
      }
    } catch (error) {
      recordErrorViaTelemetry('User cancelled install at engine check error')
      await shutdownTelemetry()
      process.exit(1)
    }
  }
}

/**
 *
 * This type has to be updated if the engines field in the create redwood app template package.json is updated.
 * @returns [boolean, Record<'node' | 'yarn', any>]
 */
function checkNodeVersion(templateDir) {
  return new Promise((resolve) => {
    const { engines } = fs.readJSONSync(path.join(templateDir, 'package.json'))

    checkNodeVersionCb(engines, (_error, result) => {
      return resolve([result.isSatisfied, result.versions])
    })
  })
}

async function createProjectFiles(appDir, { templateDir, overwrite }) {
  let newAppDir = appDir

  const tuiContent = new ReactiveTUIContent({
    mode: 'text',
    content: 'Creating project files',
    spinner: {
      enabled: true,
    },
  })
  tui.startReactive(tuiContent)

  newAppDir = await doesDirectoryAlreadyExist(newAppDir, { overwrite })

  // Ensure the new app directory exists
  fs.ensureDirSync(path.dirname(newAppDir))

  // Copy the template files to the new app directory
  fs.copySync(templateDir, newAppDir, { overwrite })

  // .gitignore is renamed here to force file inclusion during publishing
  fs.renameSync(
    path.join(newAppDir, 'gitignore.template'),
    path.join(newAppDir, '.gitignore'),
  )

  // Write the uid
  fs.ensureDirSync(path.join(newAppDir, '.redwood'))
  fs.writeFileSync(path.join(newAppDir, '.redwood', 'telemetry.txt'), UID)

  tuiContent.update({
    spinner: {
      enabled: false,
    },
    content: `${RedwoodStyling.green('✔')} Project files created`,
  })
  tui.stopReactive()

  return newAppDir
}

async function installNodeModules(newAppDir) {
  const tuiContent = new ReactiveTUIContent({
    mode: 'text',
    header: 'Installing node modules',
    content: '  ⏱ This could take a while...',
    spinner: {
      enabled: true,
    },
  })
  tui.startReactive(tuiContent)

  const oldCwd = process.cwd()
  process.chdir(newAppDir)

  const yarnInstallSubprocess = execa(`yarn install`, {
    shell: true,
    cwd: newAppDir,
  })

  try {
    await yarnInstallSubprocess
  } catch (error) {
    tui.stopReactive(true)
    tui.displayError(
      "Couldn't install node modules",
      [
        `We couldn't install node modules via ${RedwoodStyling.info(
          "'yarn install'",
        )}. Please see below for the full error message.`,
        '',
        error,
      ].join('\n'),
    )
    recordErrorViaTelemetry(error)
    await shutdownTelemetry()
    process.chdir(oldCwd)
    process.exit(1)
  }

  process.chdir(oldCwd)

  tuiContent.update({
    header: '',
    content: `${RedwoodStyling.green('✔')} Installed node modules`,
    spinner: {
      enabled: false,
    },
  })
  tui.stopReactive()
}

async function generateTypes(newAppDir) {
  const tuiContent = new ReactiveTUIContent({
    mode: 'text',
    content: 'Generating types',
    spinner: {
      enabled: true,
    },
  })
  tui.startReactive(tuiContent)

  const generateSubprocess = execa('yarn rw-gen', {
    shell: true,
    cwd: newAppDir,
  })

  try {
    await generateSubprocess
  } catch (error) {
    tui.stopReactive(true)
    tui.displayError(
      "Couldn't generate types",
      [
        `We could not generate types using ${RedwoodStyling.info(
          "'yarn rw-gen'",
        )}. Please see below for the full error message.`,
        '',
        error,
      ].join('\n'),
    )
    recordErrorViaTelemetry(error)
    await shutdownTelemetry()
    process.exit(1)
  }

  tuiContent.update({
    content: `${RedwoodStyling.green('✔')} Generated types`,
    spinner: {
      enabled: false,
    },
  })
  tui.stopReactive()
}

async function initializeGit(newAppDir, commitMessage) {
  const tuiContent = new ReactiveTUIContent({
    mode: 'text',
    content: 'Initializing a git repo',
    spinner: {
      enabled: true,
    },
  })
  tui.startReactive(tuiContent)

  const gitSubprocess = execa(
    `git init && git add . && git commit -m "${commitMessage}"`,
    {
      shell: true,
      cwd: newAppDir,
    },
  )

  try {
    await gitSubprocess
  } catch (error) {
    tui.stopReactive(true)
    tui.displayError(
      "Couldn't initialize a git repo",
      [
        `We could not initialize a git repo using ${RedwoodStyling.info(
          `git init && git add . && git commit -m "${commitMessage}"`,
        )}. Please see below for the full error message.`,
        '',
        error,
      ].join('\n'),
    )
    recordErrorViaTelemetry(error)
    await shutdownTelemetry()
    process.exit(1)
  }

  tuiContent.update({
    content: `${RedwoodStyling.green(
      '✔',
    )} Initialized a git repo with commit message "${commitMessage}"`,
    spinner: {
      enabled: false,
    },
  })
  tui.stopReactive()
}

async function handleTargetDirPreference(targetDir) {
  if (targetDir) {
    const targetDirText =
      targetDir === '.' ? 'the current directory' : targetDir

    tui.drawText(
      `${RedwoodStyling.green('✔')} Creating your Redwood app in ` +
        `${targetDirText} based on command line argument`,
    )

    return targetDir
  }

  // Prompt user for preference
  try {
    const response = await tui.prompt({
      type: 'input',
      name: 'targetDir',
      message: 'Where would you like to create your Redwood app?',
      initial: 'my-redwood-app',
    })

    if (/^~\w/.test(response.targetDir)) {
      tui.stopReactive(true)
      tui.displayError(
        'The `~username` syntax is not supported here',
        'Please use the full path or specify the target directory on the command line.',
      )

      recordErrorViaTelemetry('Target dir prompt path syntax not supported')
      await shutdownTelemetry()
      process.exit(1)
    }

    return untildify(response.targetDir)
  } catch {
    recordErrorViaTelemetry('User cancelled install at target dir prompt')
    await shutdownTelemetry()
    process.exit(1)
  }
}

async function handleTypescriptPreference(typescriptFlag) {
  // Handle case where flag is set
  if (typescriptFlag !== null) {
    tui.drawText(
      `${RedwoodStyling.green('✔')} Using ${
        typescriptFlag ? 'TypeScript' : 'JavaScript'
      } based on command line flag`,
    )
    return typescriptFlag
  }

  // Prompt user for preference
  try {
    const response = await tui.prompt({
      type: 'Select',
      name: 'language',
      choices: ['TypeScript', 'JavaScript'],
      message: 'Select your preferred language',
      initial: 'TypeScript',
    })
    return response.language === 'TypeScript'
  } catch (_error) {
    recordErrorViaTelemetry('User cancelled install at language prompt')
    await shutdownTelemetry()
    process.exit(1)
  }
}

async function handleGitPreference(gitInitFlag) {
  // Handle case where flag is set
  if (gitInitFlag !== null) {
    tui.drawText(
      `${RedwoodStyling.green('✔')} ${
        gitInitFlag ? 'Will' : 'Will not'
      } initialize a git repo based on command line flag`,
    )
    return gitInitFlag
  }

  // Prompt user for preference
  try {
    const response = await tui.prompt({
      type: 'Toggle',
      name: 'git',
      message: 'Do you want to initialize a git repo?',
      enabled: 'Yes',
      disabled: 'no',
      initial: 'Yes',
    })
    return response.git
  } catch (_error) {
    recordErrorViaTelemetry('User cancelled install at git prompt')
    await shutdownTelemetry()
    process.exit(1)
  }
}

async function doesDirectoryAlreadyExist(
  appDir,
  { overwrite, suppressWarning },
) {
  let newAppDir = appDir

  // Check if the new app directory already exists
  if (fs.existsSync(newAppDir) && !overwrite) {
    // Check if the directory contains files and show an error if it does
    if (fs.readdirSync(newAppDir).length > 0) {
      const styledAppDir = RedwoodStyling.info(newAppDir)

      if (!suppressWarning) {
        tui.stopReactive(true)
        tui.displayWarning(
          'Project directory already contains files',
          [`'${styledAppDir}' already exists and is not empty`].join('\n'),
        )
      }

      try {
        const response = await tui.prompt({
          type: 'select',
          name: 'projectDirectoryAlreadyExists',
          message: 'How would you like to proceed?',
          choices: [
            'Quit install',
            `Overwrite files in '${styledAppDir}' and continue install`,
            'Specify a different directory',
          ],
          initial: 0,
        })

        // overwrite the existing files
        if (
          response.projectDirectoryAlreadyExists ===
          `Overwrite files in '${styledAppDir}' and continue install`
        ) {
          // blow away the existing directory and create a new one
          await fs.remove(newAppDir)
        } // specify a different directory
        else if (
          response.projectDirectoryAlreadyExists ===
          'Specify a different directory'
        ) {
          const newDirectoryName = await handleNewDirectoryNamePreference()

          if (/^~\w/.test(newDirectoryName)) {
            tui.stopReactive(true)
            tui.displayError(
              'The `~username` syntax is not supported here',
              'Please use the full path or specify the target directory on the command line.',
            )

            // Calling doesDirectoryAlreadyExist again with the same old
            // appDir as a way to prompt the user for a new directory name
            // after displaying the error above
            newAppDir = await doesDirectoryAlreadyExist(appDir, {
              overwrite,
              suppressWarning: true,
            })
          } else {
            newAppDir = path.resolve(process.cwd(), untildify(newDirectoryName))
          }

          // check to see if the new directory exists
          newAppDir = await doesDirectoryAlreadyExist(newAppDir, { overwrite })
        } // Quit Install and Throw and Error
        else if (response.projectDirectoryAlreadyExists === 'Quit install') {
          // quit and throw an error
          recordErrorViaTelemetry(
            'User quit after directory already exists error',
          )
          await shutdownTelemetry()
          process.exit(1)
        }
        // overwrite the existing files
      } catch (_error) {
        recordErrorViaTelemetry(
          `User cancelled install after directory already exists error`,
        )
        await shutdownTelemetry()
        process.exit(1)
      }
    }
  }

  return newAppDir
}

async function handleNewDirectoryNamePreference() {
  try {
    const response = await tui.prompt({
      type: 'input',
      name: 'targetDirectoryInput',
      message: 'What directory would you like to create the app in?',
      initial: 'my-redwood-app',
    })
    return response.targetDirectoryInput
  } catch (_error) {
    recordErrorViaTelemetry(
      'User cancelled install at specify a different directory prompt',
    )
    await shutdownTelemetry()
    process.exit(1)
  }
}

/**
 * @param {string?} commitMessageFlag
 */
async function handleCommitMessagePreference(commitMessageFlag) {
  // Handle case where flag is set
  if (commitMessageFlag !== null) {
    return commitMessageFlag
  }

  // Prompt user for preference
  try {
    const response = await tui.prompt({
      type: 'input',
      name: 'commitMessage',
      message: 'Enter a commit message',
      initial: INITIAL_COMMIT_MESSAGE,
    })
    return response.commitMessage
  } catch (_error) {
    recordErrorViaTelemetry('User cancelled install at commit message prompt')
    await shutdownTelemetry()
    process.exit(1)
  }
}

/**
 * @param {boolean?} yarnInstallFlag
 */
async function handleYarnInstallPreference(yarnInstallFlag) {
  // Handle case where flag is set
  if (yarnInstallFlag !== null) {
    tui.drawText(
      `${RedwoodStyling.green('✔')} ${
        yarnInstallFlag ? 'Will' : 'Will not'
      } run yarn install based on command line flag`,
    )
    return yarnInstallFlag
  }

  // Prompt user for preference
  try {
    const response = await tui.prompt({
      type: 'Toggle',
      name: 'yarnInstall',
      message: 'Do you want to run yarn install?',
      enabled: 'Yes',
      disabled: 'no',
      initial: 'Yes',
    })
    return response.yarnInstall
  } catch (_error) {
    recordErrorViaTelemetry('User cancelled install at yarn install prompt')
    await shutdownTelemetry()
    process.exit(1)
  }
}

/**
 * This function creates a new RedwoodJS app.
 *
 * It performs the following actions:
 *  - TODO - Add a list of what this function does
 */
async function createRedwoodApp() {
  const cli = yargs(hideBin(process.argv))
    .scriptName(name)
    .usage('Usage: $0 <project directory>')
    .example('$0 my-redwood-app')
    .version(version)
    .option('yes', {
      alias: 'y',
      default: null,
      type: 'boolean',
      describe: 'Skip prompts and use defaults',
    })
    .option('overwrite', {
      default: false,
      type: 'boolean',
      describe: "Create even if target directory isn't empty",
    })
    .option('typescript', {
      alias: 'ts',
      default: null,
      type: 'boolean',
      describe: 'Generate a TypeScript project',
    })
    .option('git-init', {
      alias: 'git',
      default: null,
      type: 'boolean',
      describe: 'Initialize a git repository',
    })
    .option('commit-message', {
      alias: 'm',
      default: null,
      type: 'string',
      describe: 'Commit message for the initial commit',
    })
    .option('telemetry', {
      default: true,
      type: 'boolean',
      describe:
        'Enables sending telemetry events for this create command and all Redwood CLI commands https://telemetry.redwoodjs.com',
    })

  const _isYarnBerryOrNewer = isYarnBerryOrNewer()

  // Only add the yarn-install flag if the yarn version is >= 2
  if (_isYarnBerryOrNewer) {
    cli.option('yarn-install', {
      default: null,
      type: 'boolean',
      describe: 'Install node modules. Skip via --no-yarn-install.',
    })
  }

  const parsedFlags = cli.parse()

  tui.drawText(
    [
      `${RedwoodStyling.redwood('-'.repeat(66))}`,
      `${' '.repeat(16)}🌲⚡️ ${RedwoodStyling.header(
        'Welcome to RedwoodJS!',
      )} ⚡️🌲`,
      `${RedwoodStyling.redwood('-'.repeat(66))}`,
    ].join('\n'),
  )

  // Extract the args as provided by the user in the command line
  // TODO: Make all flags have the 'flag' suffix
  const args = parsedFlags._
  const yarnInstallFlag =
    parsedFlags['yarn-install'] ??
    (_isYarnBerryOrNewer ? parsedFlags.yes : null)
  const typescriptFlag = parsedFlags.typescript ?? parsedFlags.yes
  const overwrite = parsedFlags.overwrite
  const gitInitFlag = parsedFlags['git-init'] ?? parsedFlags.yes
  const commitMessageFlag =
    parsedFlags['commit-message'] ??
    (parsedFlags.yes ? INITIAL_COMMIT_MESSAGE : null)

  // Record some of the arguments for telemetry
  trace.getActiveSpan()?.setAttribute('yarn-install', yarnInstallFlag)
  trace.getActiveSpan()?.setAttribute('overwrite', overwrite)

  // Get the directory for installation from the args
  let targetDir = String(args).replace(/,/g, '-')

  const templatesDir = fileURLToPath(new URL('../templates', import.meta.url))

  // Engine check
  await executeCompatibilityCheck(path.join(templatesDir, 'ts'))

  targetDir = await handleTargetDirPreference(targetDir)

  // Determine ts/js preference
  const useTypescript = await handleTypescriptPreference(typescriptFlag)
  trace.getActiveSpan()?.setAttribute('typescript', useTypescript)

  const templateDir = path.join(templatesDir, useTypescript ? 'ts' : 'js')

  // Determine git preference
  const useGit = await handleGitPreference(gitInitFlag)
  trace.getActiveSpan()?.setAttribute('git', useGit)

  /** @type {string} */
  let commitMessage
  if (useGit) {
    commitMessage = await handleCommitMessagePreference(commitMessageFlag)
  }

  let yarnInstall = false

  if (_isYarnBerryOrNewer) {
    yarnInstall = await handleYarnInstallPreference(yarnInstallFlag)
  }

  let newAppDir = path.resolve(process.cwd(), targetDir)

  // Create project files
  // if this directory already exists then createProjectFiles may set a new directory name
  newAppDir = await createProjectFiles(newAppDir, { templateDir, overwrite })

  // Install the node packages
  if (yarnInstall) {
    const yarnInstallStart = Date.now()
    await installNodeModules(newAppDir)
    trace
      .getActiveSpan()
      ?.setAttribute('yarn-install-time', Date.now() - yarnInstallStart)
  } else {
    if (_isYarnBerryOrNewer) {
      tui.drawText(`${RedwoodStyling.info('ℹ')} Skipped yarn install step`)
    }
  }

  // Generate types
  if (yarnInstall) {
    await generateTypes(newAppDir)
  }

  // Initialize git repo
  if (useGit) {
    await initializeGit(newAppDir, commitMessage)
  }

  const shouldPrintCdCommand = newAppDir !== process.cwd()

  // Post install message
  tui.drawText(
    [
      '',
      RedwoodStyling.success('Thanks for trying out Redwood!'),
      '',
      ` ⚡️ ${RedwoodStyling.redwood(
        'Get up and running fast with this Quick Start guide',
      )}: https://redwoodjs.com/quick-start`,
      '',
      `${RedwoodStyling.header(`Fire it up!`)} 🚀`,
      '',
      ...[
        shouldPrintCdCommand &&
          `${RedwoodStyling.redwood(
            ` > ${RedwoodStyling.green(
              `cd ${path.relative(process.cwd(), newAppDir)}`,
            )}`,
          )}`,
        !yarnInstall &&
          `${RedwoodStyling.redwood(
            ` > ${RedwoodStyling.green(`yarn install`)}`,
          )}`,
        `${RedwoodStyling.redwood(
          ` > ${RedwoodStyling.green(`yarn rw dev`)}`,
        )}`,
      ].filter(Boolean),
      '',
    ].join('\n'),
  )
}

if (telemetry) {
  try {
    await startTelemetry()
  } catch (error) {
    console.error('Telemetry startup error')
    console.error(error)
  }
}

// Execute create redwood app within a span
const tracer = trace.getTracer('redwoodjs')
await tracer.startActiveSpan('create-redwood-app', async (span) => {
  await createRedwoodApp()

  // Span housekeeping
  span?.setStatus({ code: SpanStatusCode.OK })
  span?.end()
})

// Shutdown telemetry, ensures data is sent before the process exits
try {
  await shutdownTelemetry()
} catch (error) {
  console.error('Telemetry shutdown error')
  console.error(error)
}
