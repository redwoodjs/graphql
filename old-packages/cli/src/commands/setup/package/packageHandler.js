import enq from 'enquirer'
import execa from 'execa'
import semver from 'semver'

import { getCompatibilityData } from '@redwoodjs/cli-helpers'
import { getPaths } from '@redwoodjs/project-config'

export async function handler({ npmPackage, force, _: _args }) {
  // Extract package name and version which the user provided
  const isScoped = npmPackage.startsWith('@')
  const packageName =
    (isScoped ? '@' : '') + npmPackage.split('@')[isScoped ? 1 : 0]
  const packageVersion = npmPackage.split('@')[isScoped ? 2 : 1] ?? 'latest'

  // Extract any additional arguments that came after a '--'
  // See: https://github.com/yargs/yargs/blob/main/docs/tricks.md#stop-parsing
  const additionalOptionsToForward = _args.slice(2) ?? []

  // If we're using force don't attempt anything fancy, just run the package after some messaging
  if (force) {
    console.log(
      'No compatibility check will be performed because you used the --force flag.',
    )
    if (
      semver.parse(packageVersion) !== null &&
      semver.lt(packageVersion, '1.0.0')
    ) {
      console.log(
        'Be aware that this package is under version 1.0.0 and so should be considered experimental.',
      )
    }
    await runPackage(packageName, packageVersion, additionalOptionsToForward)
    return
  }

  console.log('Checking compatibility...')
  let compatibilityData
  try {
    compatibilityData = await getCompatibilityData(packageName, packageVersion)
  } catch (error) {
    console.log('The following error occurred while checking compatibility:')
    const errorMessage = error.message ?? error
    console.log(errorMessage)

    // Exit without a chance to continue if it makes sense to do so
    if (
      errorMessage.includes('does not have a tag') ||
      errorMessage.includes('does not have a version')
    ) {
      process.exit(1)
    }

    const decision = await promptWithChoices('What would you like to do?', [
      {
        name: 'cancel',
        message: 'Cancel',
      },
      {
        name: 'continue',
        message: 'Continue regardless of potential incompatibility',
      },
    ])
    if (decision === 'continue') {
      await runPackage(packageName, packageVersion, additionalOptionsToForward)
    }
    return
  }

  const { preferred, compatible } = compatibilityData
  const preferredVersionIsCompatible = preferred.version === compatible.version

  if (preferredVersionIsCompatible) {
    await showExperimentalWarning(preferred.version)
    await runPackage(packageName, preferred.version, additionalOptionsToForward)
    return
  }

  const preferredVersionText = `${preferred.version}${
    preferred.tag ? ` (${preferred.tag})` : ''
  }`
  const latestCompatibleVersionText = `${compatible.version}${
    compatible.tag ? ` (${compatible.tag})` : ''
  }`
  console.log(
    `The version ${preferredVersionText} of '${packageName}' is not compatible with your RedwoodJS project version.\nThe latest version compatible with your project is ${latestCompatibleVersionText}.`,
  )

  const decision = await promptWithChoices('What would you like to do?', [
    {
      name: 'useLatestCompatibleVersion',
      message: `Use the latest compatible version: ${latestCompatibleVersionText}`,
    },
    {
      name: 'usePreferredVersion',
      message: `Continue anyway with version: ${preferredVersionText}`,
    },
    {
      name: 'cancel',
      message: 'Cancel',
    },
  ])
  if (decision === 'cancel') {
    process.exitCode = 1
    return
  }

  const versionToUse =
    decision === 'useLatestCompatibleVersion'
      ? compatible.version
      : preferred.version
  await showExperimentalWarning(versionToUse)
  await runPackage(packageName, versionToUse, additionalOptionsToForward)
}

async function showExperimentalWarning(version) {
  if (
    version === undefined ||
    semver.parse(version) === null ||
    semver.gte(version, '1.0.0')
  ) {
    return
  }

  const decision = await promptWithChoices(
    'This package is under version 1.0.0 and so should be considered experimental. Would you like to continue?',
    [
      {
        name: 'yes',
        message: 'Yes',
      },
      {
        name: 'no',
        message: 'No',
      },
    ],
  )
  if (decision === 'no') {
    process.exit()
  }
}

async function runPackage(packageName, version, options = []) {
  const versionString = version === undefined ? '' : `@${version}`
  console.log(`Running ${packageName}${versionString}...`)
  try {
    await execa('yarn', ['dlx', `${packageName}${versionString}`, ...options], {
      stdio: 'inherit',
      cwd: getPaths().base,
    })
  } catch (error) {
    // The execa process should have already printed any errors
    process.exitCode = error.exitCode ?? 1
  }
}

async function promptWithChoices(message, choices) {
  try {
    const prompt = new enq.Select({
      name: message.substring(0, 8).toLowerCase(),
      message,
      choices,
    })
    return await prompt.run()
  } catch (error) {
    // SIGINT seems to throw a "" error so we'll attempt to ignore that
    if (error) {
      throw error
    }
  }
  return null
}
