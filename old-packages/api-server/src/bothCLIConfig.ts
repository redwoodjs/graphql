import type { Argv } from 'yargs'

import type { BothParsedOptions } from './types'

export const description = 'Start a server for serving the api and web sides'

export function builder(yargs: Argv<BothParsedOptions>) {
  yargs.options({
    webPort: {
      description: 'The port for the web server to listen on',
      type: 'number',
      alias: ['web-port'],
    },
    webHost: {
      description:
        "The host for the web server to listen on. Note that you most likely want this to be '0.0.0.0' in production",
      type: 'string',
      alias: ['web-host'],
    },
    apiPort: {
      description: 'The port for the api server to listen on',
      type: 'number',
      alias: ['api-port'],
    },
    apiHost: {
      description:
        "The host for the api server to listen on. Note that you most likely want this to be '0.0.0.0' in production",
      type: 'string',
      alias: ['api-host'],
    },
    apiRootPath: {
      description: 'Root path where your api functions are served',
      type: 'string',
      alias: ['api-root-path', 'rootPath', 'root-path'],
      default: '/',
    },
  })
}

export async function handler(options: BothParsedOptions) {
  const { handler } = await import('./bothCLIConfigHandler.js')
  await handler(options)
}
