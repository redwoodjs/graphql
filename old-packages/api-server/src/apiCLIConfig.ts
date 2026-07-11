import type { Argv } from 'yargs'

import type { APIParsedOptions } from './types'

export const description = 'Start a server for serving the api side'

export function builder(yargs: Argv<APIParsedOptions>) {
  yargs.options({
    port: {
      description: 'The port to listen at',
      type: 'number',
      alias: 'p',
    },
    host: {
      description:
        "The host to listen at. Note that you most likely want this to be '0.0.0.0' in production",
      type: 'string',
    },
    apiRootPath: {
      description: 'Root path where your api functions are served',
      type: 'string',
      alias: ['api-root-path', 'rootPath', 'root-path'],
      default: '/',
    },
    // This became a no-op in v7 because env files weren't loaded by default
    // but removing it would break yargs parsing for older projects,
    // so leaving it here so that yargs doesn't throw an error
    loadEnvFiles: {
      hidden: true,
    },
  })
}

export async function handler(options: APIParsedOptions) {
  const { handler } = await import('./apiCLIConfigHandler.js')
  await handler(options)
}
