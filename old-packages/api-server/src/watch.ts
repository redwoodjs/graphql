import path from 'path'

import chalk from 'chalk'
import chokidar from 'chokidar'
import dotenv from 'dotenv'

import {
  buildApi,
  cleanApiBuild,
  rebuildApi,
} from '@redwoodjs/internal/dist/build/api'
import { loadAndValidateSdls } from '@redwoodjs/internal/dist/validateSchema'
import { ensurePosixPath, getPaths } from '@redwoodjs/project-config'

import type { BuildAndRestartOptions } from './buildManager'
import { BuildManager } from './buildManager'
import { serverManager } from './serverManager'

const rwjsPaths = getPaths()

if (!process.env.REDWOOD_ENV_FILES_LOADED) {
  dotenv.config({
    path: path.join(rwjsPaths.base, '.env'),
    // @ts-expect-error The types for dotenv-defaults are using an outdated version of dotenv
    defaults: path.join(rwjsPaths.base, '.env.defaults'),
    multiline: true,
  })

  process.env.REDWOOD_ENV_FILES_LOADED = 'true'
}

async function buildAndServe(options: BuildAndRestartOptions) {
  const buildTs = Date.now()
  console.log(chalk.dim.italic('Building...'))

  if (options.clean) {
    await cleanApiBuild()
  }

  if (options.rebuild) {
    await rebuildApi()
  } else {
    await buildApi()
  }

  await serverManager.restartApiServer()

  console.log(chalk.dim.italic('Took ' + (Date.now() - buildTs) + ' ms'))
}

const buildManager = new BuildManager(buildAndServe)

async function validateSdls() {
  try {
    await loadAndValidateSdls()
    return true
  } catch (e: any) {
    serverManager.killApiServer()
    console.error(
      chalk.redBright(`[GQL Server Error] - Schema validation failed`),
    )
    console.error(chalk.red(e?.message))
    console.error(chalk.redBright('-'.repeat(40)))

    buildManager.cancelScheduledBuild()
    return false
  }
}

// NOTE: the file comes through as a unix path, even on windows
// So we need to convert the rwjsPaths

const IGNORED_API_PATHS = [
  'api/dist', // use this, because using rwjsPaths.api.dist seems to not ignore on first build
  rwjsPaths.api.types,
  rwjsPaths.api.db,
].map((path) => ensurePosixPath(path))

chokidar
  .watch([rwjsPaths.api.src], {
    persistent: true,
    ignoreInitial: true,
    ignored: (file: string) => {
      const x =
        file.includes('node_modules') ||
        IGNORED_API_PATHS.some((ignoredPath) => file.includes(ignoredPath)) ||
        [
          '.DS_Store',
          '.db',
          '.sqlite',
          '-journal',
          '.test.js',
          '.test.ts',
          '.scenarios.ts',
          '.scenarios.js',
          '.d.ts',
          '.log',
        ].some((ext) => file.endsWith(ext))
      return x
    },
  })
  .on('ready', async () => {
    // First time
    await buildManager.run({ clean: true, rebuild: false })
    await validateSdls()
  })
  .on('all', async (eventName, filePath) => {
    // On sufficiently large projects (500+ files, or >= 2000 ms build times) on older machines,
    // esbuild writing to the api directory makes chokidar emit an `addDir` event.
    // This starts an infinite loop where the api starts building itself as soon as it's finished.
    // This could probably be fixed with some sort of build caching
    if (eventName === 'addDir' && filePath === rwjsPaths.api.base) {
      return
    }

    if (eventName) {
      if (filePath.includes('.sdl')) {
        // We validate here, so that developers will see the error
        // As they're running the dev server
        const isValid = await validateSdls()

        // Exit early if not valid
        if (!isValid) {
          return
        }
      }
    }

    console.log(
      chalk.dim(`[${eventName}] ${filePath.replace(rwjsPaths.api.base, '')}`),
    )

    buildManager.cancelScheduledBuild()
    if (eventName === 'add' || eventName === 'unlink') {
      await buildManager.run({ rebuild: false })
    } else {
      // If files have just changed, then rebuild
      await buildManager.run({ rebuild: true })
    }
  })
