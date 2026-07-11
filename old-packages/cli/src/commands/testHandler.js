import path from 'path'

import execa from 'execa'
import fs from 'fs-extra'

import { recordTelemetryAttributes } from '@redwoodjs/cli-helpers'
import { ensurePosixPath } from '@redwoodjs/project-config'
import { errorTelemetry, timedTelemetry } from '@redwoodjs/telemetry'

import { getPaths } from '../lib'
import c from '../lib/colors'
import * as project from '../lib/project'

// https://github.com/facebook/create-react-app/blob/cbad256a4aacfc3084be7ccf91aad87899c63564/packages/react-scripts/scripts/test.js#L39
function isInGitRepository() {
  try {
    execa.commandSync('git rev-parse --is-inside-work-tree')
    return true
  } catch {
    return false
  }
}

function isInMercurialRepository() {
  try {
    execa.commandSync('hg --cwd . root')
    return true
  } catch {
    return false
  }
}

function isJestConfigFile(sides) {
  for (let side of sides) {
    try {
      if (sides.includes(side)) {
        const jestConfigExists =
          fs.existsSync(path.join(side, 'jest.config.js')) ||
          fs.existsSync(path.join(side, 'jest.config.ts'))

        if (!jestConfigExists) {
          console.error(
            c.error(
              `\nError: Missing Jest config file ${side}/jest.config.js` +
                '\nTo add this file, run `npx @redwoodjs/codemods update-jest-config`\n',
            ),
          )
          throw new Error(`Error: Jest config file not found in ${side} side`)
        }
      }
    } catch (e) {
      errorTelemetry(process.argv, e.message)
      process.exit(e?.exitCode || 1)
    }
  }
}

export const handler = async ({
  filter: filterParams = [],
  watch = true,
  collectCoverage = false,
  dbPush = true,
  ...others
}) => {
  recordTelemetryAttributes({
    command: 'test',
    watch,
    collectCoverage,
    dbPush,
  })
  const rwjsPaths = getPaths()
  const forwardJestFlags = Object.keys(others).flatMap((flagName) => {
    if (
      [
        'collect-coverage',
        'db-push',
        'loadEnvFiles',
        'watch',
        '$0',
        '_',
      ].includes(flagName)
    ) {
      // filter out flags meant for the rw test command only
      return []
    } else {
      // and forward on the other flags
      const flag = flagName.length > 1 ? `--${flagName}` : `-${flagName}`
      const flagValue = others[flagName]

      if (Array.isArray(flagValue)) {
        // jest does not collapse flags e.g. --coverageReporters=html --coverageReporters=text
        // so we pass it on. Yargs collapses these flags into an array of values
        return flagValue.flatMap((val) => [flag, val])
      } else {
        return [flag, flagValue]
      }
    }
  })

  // Only the side params
  const sides = filterParams.filter((filterString) =>
    project.sides().includes(filterString),
  )

  // All the other params, apart from sides
  const jestFilterArgs = [
    ...filterParams.filter(
      (filterString) => !project.sides().includes(filterString),
    ),
  ]

  const jestArgs = [
    ...jestFilterArgs,
    ...forwardJestFlags,
    collectCoverage ? '--collectCoverage' : null,
    '--passWithNoTests',
  ].filter((flagOrValue) => flagOrValue !== null) // Filter out nulls, not booleans because user may have passed a --something false flag

  // If the user wants to watch, set the proper watch flag based on what kind of repo this is
  // because of https://github.com/facebook/create-react-app/issues/5210
  if (watch && !process.env.CI && !collectCoverage) {
    const hasSourceControl = isInGitRepository() || isInMercurialRepository()
    jestArgs.push(hasSourceControl ? '--watch' : '--watchAll')
  }

  // if no sides declared with yargs, default to all sides
  if (!sides.length) {
    project.sides().forEach((side) => sides.push(side))
  }

  if (sides.length > 0) {
    jestArgs.push('--projects', ...sides)
  }

  //checking if Jest config files exists in each of the sides
  isJestConfigFile(sides)

  try {
    const cacheDirDb = `file:${ensurePosixPath(
      rwjsPaths.generated.base,
    )}/test.db`
    const DATABASE_URL = process.env.TEST_DATABASE_URL || cacheDirDb

    if (sides.includes('api') && !dbPush) {
      // @NOTE
      // DB push code now lives in packages/testing/config/jest/api/jest-preset.js
      process.env.SKIP_DB_PUSH = '1'
    }

    // **NOTE** There is no official way to run Jest programmatically,
    // so we're running it via execa, since `jest.run()` is a bit unstable.
    // https://github.com/facebook/jest/issues/5048
    const runCommand = async () => {
      await execa('yarn jest', jestArgs, {
        cwd: rwjsPaths.base,
        shell: true,
        stdio: 'inherit',
        env: { DATABASE_URL },
      })
    }

    if (watch) {
      await runCommand()
    } else {
      await timedTelemetry(process.argv, { type: 'test' }, async () => {
        await runCommand()
      })
    }
  } catch (e) {
    // Errors already shown from execa inherited stderr
    errorTelemetry(process.argv, e.message)
    process.exit(e?.exitCode || 1)
  }
}
