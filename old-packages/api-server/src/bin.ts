import path from 'path'

import { config } from 'dotenv-defaults'
import { hideBin } from 'yargs/helpers'
import yargs from 'yargs/yargs'

import { getPaths } from '@redwoodjs/project-config'
import {
  description as webDescription,
  builder as webBuilder,
  handler as webHandler,
} from '@redwoodjs/web-server'

import {
  description as apiDescription,
  builder as apiBuilder,
} from './apiCLIConfig'
import { handler as apiHandler } from './apiCLIConfigHandler'
import {
  description as bothDescription,
  builder as bothBuilder,
} from './bothCLIConfig'
import { handler as bothHandler } from './bothCLIConfigHandler'

if (!process.env.REDWOOD_ENV_FILES_LOADED) {
  config({
    path: path.join(getPaths().base, '.env'),
    defaults: path.join(getPaths().base, '.env.defaults'),
    multiline: true,
  })

  process.env.REDWOOD_ENV_FILES_LOADED = 'true'
}

process.env.NODE_ENV ??= 'production'

yargs(hideBin(process.argv))
  .scriptName('rw-server')
  .strict()
  .alias('h', 'help')
  .alias('v', 'version')
  .command(
    '$0',
    bothDescription,
    // @ts-expect-error The yargs types seem wrong; it's ok for builder to be a function
    bothBuilder,
    bothHandler,
  )
  .command(
    'api',
    apiDescription,
    // @ts-expect-error The yargs types seem wrong; it's ok for builder to be a function
    apiBuilder,
    apiHandler,
  )
  .command(
    'web',
    webDescription,
    // @ts-expect-error The yargs types seem wrong; it's ok for builder to be a function
    webBuilder,
    webHandler,
  )
  .parse()
