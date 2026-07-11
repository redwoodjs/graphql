import path from 'path'

import { config } from 'dotenv-defaults'
import { hideBin } from 'yargs/helpers'
import yargs from 'yargs/yargs'

import { getPaths } from '@redwoodjs/project-config'

import { description, builder } from './commands/up'
import { handler } from './commands/upHandler'

if (!process.env.REDWOOD_ENV_FILES_LOADED) {
  config({
    path: path.join(getPaths().base, '.env'),
    defaults: path.join(getPaths().base, '.env.defaults'),
    // @ts-expect-error - Old typings. @types/dotenv-defaults depends on dotenv
    // v8. dotenv-defaults uses dotenv v14
    multiline: true,
  })

  process.env.REDWOOD_ENV_FILES_LOADED = 'true'
}

yargs(hideBin(process.argv))
  .scriptName('data-migrate')
  // @ts-expect-error not sure; this is a valid signature
  .command('$0', description, builder, handler)
  .parse()
