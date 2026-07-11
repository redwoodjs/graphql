#!/usr/bin/env node
import fs from 'node:fs'

import yargsParser from 'yargs-parser'

import { getConfig, getPaths } from '@redwoodjs/project-config'
import { buildWeb } from '@redwoodjs/vite/build'
import { buildFeServer } from '@redwoodjs/vite/buildFeServer'

const rwPaths = getPaths()

const { webDir, verbose } = yargsParser(process.argv.slice(2), {
  string: ['webDir'],
  boolean: ['verbose'],
})

if (!webDir) {
  console.error(
    'Please pass the full path to the web side using the --webDir argument',
  )
  process.exit(1)
}

if (!fs.existsSync(webDir)) {
  console.error(`Could not find web directory at ${webDir}`)
  process.exit(1)
}

if (!fs.existsSync(`${webDir}/package.json`)) {
  console.error(`${webDir} does not appear to be a Redwood web directory`)
  process.exit(1)
}

/**
 * Build the web side of a Redwood project using Vite
 * @param {string} webDir - The path to the web side of the project
 */
const buildWebSide = async (webDir) => {
  const configFile = rwPaths.web.viteConfig

  if (!configFile) {
    throw new Error('Could not locate your web/vite.config.{js,ts} file')
  }

  if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'production'
  }

  if (getConfig().experimental?.streamingSsr?.enabled) {
    // Webdir checks handled in the rwjs/vite package in new build system
    await buildFeServer({ verbose, webDir })
  } else {
    // Ensure cwd to be web: required for postcss/tailwind to work correctly
    process.chdir(webDir)
    // Right now, the buildWeb function looks up the config file from project-config
    // In the future, if we have multiple web spaces we could pass in the cwd here
    buildWeb({ verbose })
  }
}

buildWebSide(webDir)
