export const command = 'prerender'
export const aliases = ['render']
export const description = 'Prerender pages of your Redwood app at build time'

export const builder = (yargs) => {
  yargs.showHelpOnFail(false)

  yargs.option('path', {
    alias: ['p', 'route'],
    description: 'Router path to prerender. Especially useful for debugging',
    type: 'string',
  })

  yargs.option('dry-run', {
    alias: ['d', 'dryrun'],
    default: false,
    description: 'Run prerender and output to console',
    type: 'boolean',
  })

  yargs.option('verbose', {
    alias: 'v',
    default: false,
    description: 'Print more',
    type: 'boolean',
  })
}

export const handler = async (options) => {
  const { handler } = await import('./prerenderHandler.js')
  return handler(options)
}
