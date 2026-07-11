import path from 'path'

import concurrently from 'concurrently'
import execa from 'execa'
import { Listr } from 'listr2'

import { recordTelemetryAttributes } from '@redwoodjs/cli-helpers'

import { getCmdMajorVersion } from '../commands/upgrade'
import { getPaths } from '../lib'
import { generatePrismaClient } from '../lib/generatePrismaClient'

export const handler = async ({ sides, verbose, prisma, generate }) => {
  recordTelemetryAttributes({
    command: 'type-check',
    sides: JSON.stringify(sides),
    verbose,
    prisma,
    generate,
  })

  /**
   * Check types for the project directory : [web, api]
   */

  const typeCheck = async () => {
    let conclusiveExitCode = 0

    const yarnVersion = await getCmdMajorVersion('yarn')

    const tscForAllSides = sides.map((side) => {
      const projectDir = path.join(getPaths().base, side)
      // -s flag to suppress error output from yarn. For example yarn doc link on non-zero status.
      // Since it'll be printed anyways after the whole execution.
      return {
        cwd: projectDir,
        command: `yarn ${
          yarnVersion > 1 ? '' : '-s'
        } tsc --noEmit --skipLibCheck`,
      }
    })

    const { result } = concurrently(tscForAllSides, {
      group: true,
      raw: true,
    })
    try {
      await result
    } catch (err) {
      if (err.length) {
        // Non-null exit codes
        const exitCodes = err.map((e) => e?.exitCode).filter(Boolean)
        conclusiveExitCode = Math.max(...exitCodes)
      }
    }

    return conclusiveExitCode
  }

  if (generate && prisma) {
    await generatePrismaClient({
      verbose: verbose,
      schema: getPaths().api.dbSchema,
    })
  }
  if (generate) {
    await new Listr(
      [
        {
          title: 'Generating types',
          task: () =>
            execa('yarn rw-gen', {
              shell: true,
              stdio: verbose ? 'inherit' : 'ignore',
            }),
        },
      ],
      {
        renderer: verbose && 'verbose',
        rendererOptions: { collapseSubtasks: false },
      },
    ).run()
  }

  const exitCode = await typeCheck()
  if (exitCode > 0) {
    process.exitCode = exitCode
  }
}
