// helper used in Dev and Build commands

import path from 'path'

import fs from 'fs-extra'

import { runCommandTask, getPaths } from '../lib'

const skipTask = (schema = getPaths().api.dbSchema) => {
  if (!fs.existsSync(schema)) {
    console.log(
      `Skipping database and Prisma client generation, no \`schema.prisma\` file found: \`${schema}\``,
    )
    return true
  }
  return false
}

export const generatePrismaCommand = (schema) => {
  if (skipTask(schema)) {
    return {}
  }

  return {
    cmd: `node "${require.resolve('prisma/build/index.js')}"`,
    args: ['generate', schema && `--schema="${schema}"`],
  }
}

/**
 * Conditionally generate the prisma client, skip if it already exists.
 */
export const generatePrismaClient = async ({
  verbose = true,
  force = true,
  schema = getPaths().api.dbSchema,
}) => {
  if (skipTask(schema)) {
    return
  }

  // Do not generate the Prisma client if it exists.
  if (!force) {
    // The Prisma client throws if it is not generated.
    try {
      // Import the client from the redwood apps node_modules path.
      const { PrismaClient } = require(
        path.join(getPaths().base, 'node_modules/.prisma/client'),
      )
      // eslint-disable-next-line
      new PrismaClient()
      return // Client exists, so abort.
    } catch (e) {
      // Swallow your pain, and generate.
    }
  }

  return await runCommandTask(
    [
      {
        title: 'Generating the Prisma client...',
        ...generatePrismaCommand(schema),
      },
    ],
    {
      verbose,
    },
  )
}
