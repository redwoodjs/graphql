export const command = 'prisma [commands..]'
export const description = 'Run Prisma CLI with experimental features'

/**
 * This is a lightweight wrapper around Prisma's CLI with some Redwood CLI modifications.
 */
export const builder = (yargs) => {
  // Disable yargs parsing of commands and options because it's forwarded
  // to Prisma CLI.
  yargs
    .strictOptions(false)
    .strictCommands(false)
    .strict(false)
    .parserConfiguration({
      'camel-case-expansion': false,
    })
    .help(false)
    .version(false)
}

export const handler = async (options) => {
  const { handler } = await import('./prismaHandler.js')
  return handler(options)
}
