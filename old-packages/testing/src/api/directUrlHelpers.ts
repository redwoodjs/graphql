import path from 'path'

export function getDefaultDb(rwjsCwd: string) {
  return `file:${path.join(rwjsCwd, '.redwood', 'test.db')}`
}

export function checkAndReplaceDirectUrl(
  prismaSchema: string,
  defaultDb: string,
) {
  // Check the schema.prisma for a directUrl.
  const directUrl = prismaSchema.match(PRISMA_DIRECT_URL_REGEXP)

  // If it's not there, make this a no-op.
  if (!directUrl) {
    return
  }

  // If it is, set its env var to the test equivalent.
  const directUrlEnvMatch = directUrl[0].match(BETWEEN_PARENTHESES_REGEXP) //[2]

  // This is mostly to please TS. But it's good to be safe because in this case we want to be 100% correct.
  if (!directUrlEnvMatch) {
    throw new Error(
      'Error parsing `directUrl` from schema.prisma. Proceeding with this env var could be dangerous. Please check your schema.prisma file; if everything looks ok, file an issue.',
    )
  }

  // `directUrlEnvMatch` look something like `["(DIRECT_URL)", "", "DIRECT_URL"]`. We want the third element.
  const directUrlEnv = directUrlEnvMatch[2]

  process.env[directUrlEnv] =
    process.env.TEST_DIRECT_URL || process.env.TEST_DATABASE_URL || defaultDb

  return directUrlEnv
}

const PRISMA_DIRECT_URL_REGEXP = /directUrl(\s*)=(\s*)env\(('|")(.*)('|")\)/g
const BETWEEN_PARENTHESES_REGEXP = /\(('|")([^)]+)('|")\)/
