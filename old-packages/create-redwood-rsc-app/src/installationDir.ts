import enquirer from 'enquirer'
import fs from 'node:fs'
import untildify from 'untildify'

import type { Config } from './config.js'

import { ExitCodeError } from './error.js'

export async function setInstallationDir(config: Config) {
  if (!config.installationDir) {
    console.log()
    console.log('Where do you want to install the RedwoodJS RSC project?')
    config.installationDir = await promptForInstallationDir()
  } else if (fs.existsSync(config.installationDir)) {
    console.log()
  }

  await checkInstallationDir(config, { firstRun: true })

  console.log('🗂️  Creating project at: ' + config.installationDir)
}

async function checkInstallationDir(config: Config, { firstRun = false } = {}) {
  if (fs.existsSync(config.installationDir)) {
    const { dir }: { dir: string } = await enquirer.prompt({
      type: 'select',
      name: 'dir',
      message: `The directory ${config.installationDir} already exists and is not empty. What do you want to do?`,
      choices: [
        // TODO: Decide if this option makes sense
        // { label: "Overwrite existing files", value: "overwrite" },
        {
          message: 'Choose another directory',
          name: 'other',
        },
        {
          message: 'Empty directory before continuing',
          name: 'empty',
        },
        { message: 'Exit', name: 'exit' },
      ],
    })

    switch (dir) {
      case 'other':
        config.installationDir = await promptForInstallationDir()
        await checkInstallationDir(config)
        break
      case 'empty':
        console.log()
        console.log(`🗑️  Emptying ${config.installationDir}...`)
        fs.rmSync(config.installationDir, { recursive: true, force: true })
        break
      case 'exit':
        throw new ExitCodeError(0, 'User chose to exit')
    }
  } else if (!firstRun) {
    // The things we do to make the output look nice... :'(
    console.log()
  }
}

async function promptForInstallationDir() {
  const { installationDir }: { installationDir: string } =
    await enquirer.prompt({
      type: 'text',
      name: 'installationDir',
      message: 'Enter the directory to install the project into',
    })

  if (/^~\w/.test(installationDir)) {
    console.log('The `~username` syntax is not supported here')
    console.log(
      'Please use the full path or specify the target directory on the ' +
      'command line.',
    )

    return await promptForInstallationDir()
  }

  // Use untildify to fake ~ shell expansion
  return untildify(installationDir)
}
