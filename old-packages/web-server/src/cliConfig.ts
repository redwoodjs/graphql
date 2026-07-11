import type { Argv } from 'yargs'

import type { ParsedOptions } from './types'

export const description = 'Start a server for serving the web side'

export function builder(yargs: Argv<ParsedOptions>) {
  yargs.options({
    port: {
      description: 'The port to listen on',
      type: 'number',
      alias: 'p',
    },
    host: {
      description:
        "The host to listen on. Note that you most likely want this to be '0.0.0.0' in production",
      type: 'string',
    },
    apiProxyTarget: {
      description:
        'Forward requests from the apiUrl (in the redwood.toml) to this target. apiUrl must be a relative URL',
      type: 'string',
      alias: 'api-proxy-target',
    },
    // Deprecated alias of `apiProxyTarget`
    apiHost: {
      hidden: true,
      alias: 'api-host',
    },
  })
}

export async function handler(options: ParsedOptions) {
  const { handler } = await import('./cliConfigHandler.js')
  await handler(options)
}
