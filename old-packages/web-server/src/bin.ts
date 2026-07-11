import path from 'path'

import { config } from 'dotenv-defaults'
import { hideBin } from 'yargs/helpers'
import yargs from 'yargs/yargs'

import { getPaths } from '@redwoodjs/project-config'

import { bin } from '../package.json'

import { description, builder } from './cliConfig'
import { handler } from './cliConfigHandler'

if (!process.env.REDWOOD_ENV_FILES_LOADED) {
  config({
    path: path.join(getPaths().base, '.env'),
    defaults: path.join(getPaths().base, '.env.defaults'),
    multiline: true,
  })

  process.env.REDWOOD_ENV_FILES_LOADED = 'true'
}

process.env.NODE_ENV ??= 'production'

const [scriptName] = Object.keys(bin)

yargs(hideBin(process.argv))
  .scriptName(scriptName)
  .alias('h', 'help')
  .alias('v', 'version')
  .strict()
  .example(
    'yarn $0 --api-url=/api --api-proxy-target=https://api.redwood.horse',
    "Start the web server and proxy requests made to '/api' to 'https://api.redwood.horse'",
  )
  .example(
    'yarn $0 --api-url=https://api.redwood.horse',
    "Start the web server send api requests to 'https://api.redwood.horse' (make sure to configure CORS)",
  )
  // @ts-expect-error The yargs types seem wrong; it's ok for builder to be a function
  .command('$0', description, builder, handler)
  .parse()
