import fs from 'node:fs'
import path from 'node:path'

import { config as dotenvConfig } from 'dotenv'
import { config as dotenvDefaultsConfig } from 'dotenv-defaults'
import { hideBin } from 'yargs/helpers'
import parser from 'yargs-parser'

import { getPaths } from '@redwoodjs/project-config'

export function loadEnvFiles() {
  if (process.env.REDWOOD_ENV_FILES_LOADED) {
    return
  }

  const { base } = getPaths()

  loadDefaultEnvFiles(base)
  loadNodeEnvDerivedEnvFile(base)

  const { loadEnvFiles } = parser(hideBin(process.argv), {
    array: ['load-env-files'],
    default: {
      loadEnvFiles: [],
    },
  })

  if (loadEnvFiles.length > 0) {
    loadUserSpecifiedEnvFiles(base, loadEnvFiles)
  }

  process.env.REDWOOD_ENV_FILES_LOADED = 'true'
}

export function loadDefaultEnvFiles(cwd: string) {
  dotenvDefaultsConfig({
    path: path.join(cwd, '.env'),
    defaults: path.join(cwd, '.env.defaults'),
    // @ts-expect-error - Old typings. @types/dotenv-defaults depends on dotenv
    // v8. dotenv-defaults uses dotenv v14
    multiline: true,
  })
}

export function loadNodeEnvDerivedEnvFile(cwd: string) {
  if (!process.env.NODE_ENV) {
    return
  }

  const nodeEnvDerivedEnvFilePath = path.join(
    cwd,
    `.env.${process.env.NODE_ENV}`,
  )
  if (!fs.existsSync(nodeEnvDerivedEnvFilePath)) {
    return
  }

  dotenvConfig({ path: nodeEnvDerivedEnvFilePath, override: true })
}

export function loadUserSpecifiedEnvFiles(cwd: string, loadEnvFiles: string[]) {
  for (const suffix of loadEnvFiles) {
    const envPath = path.join(cwd, `.env.${suffix}`)
    if (!fs.existsSync(envPath)) {
      throw new Error(
        `Couldn't find an .env file at '${envPath}' as specified by '--load-env-files'`,
      )
    }

    dotenvConfig({ path: envPath, override: true })
  }
}
