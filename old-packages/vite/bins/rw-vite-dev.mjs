#!/usr/bin/env node
import { createServer } from 'vite'
import yargsParser from 'yargs-parser'

import { getPaths } from '@redwoodjs/project-config'

const rwPaths = getPaths()

const startDevServer = async () => {
  const configFile = rwPaths.web.viteConfig

  if (!configFile) {
    throw new Error('Could not locate your web/vite.config.{js,ts} file')
  }

  // Tries to maintain the same options as vite's dev cli
  // See here: https://github.com/vitejs/vite/blob/main/packages/vite/src/node/cli.ts#L103
  // e.g. yarn rw dev web --fwd="--force"
  const {
    force: forceOptimize,
    forwardedServerArgs,
    debug,
  } = yargsParser(process.argv.slice(2), {
    boolean: ['https', 'open', 'strictPort', 'force', 'cors', 'debug'],
    number: ['port'],
  })

  const devServer = await createServer({
    configFile,
    envFile: false, // env file is handled by plugins in the redwood-vite plugin
    optimizeDeps: {
      // This is the only value that isn't a server option
      force: forceOptimize,
    },
    server: forwardedServerArgs,
    logLevel: debug ? 'info' : undefined,
  })

  await devServer.listen()

  process.stdin.on('data', async (data) => {
    const str = data.toString().trim().toLowerCase()
    if (str === 'rs' || str === 'restart') {
      await devServer.restart(true)
    }
  })

  devServer.printUrls()

  if (debug) {
    console.log('~~~ Vite Server Config ~~~')
    console.log(JSON.stringify(devServer.config, ' ', 2))
    console.log('~~~~~~~~~~~~~~~~~~~~~~~~~~')
  }
}

startDevServer()
