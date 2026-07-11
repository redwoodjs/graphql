import { vi, beforeAll, afterAll, describe, it, expect } from 'vitest'

import { createUserModelTask } from '../setupData'

const RWJS_CWD = process.env.RWJS_CWD
const { redwoodProjectPath, dbSchemaPath, libPath, functionsPath } = vi.hoisted(
  () => {
    const redwoodProjectPath = '../../../../__fixtures__/test-project'

    return {
      redwoodProjectPath,
      dbSchemaPath: redwoodProjectPath + '/api/db/schema.prisma',
      libPath: redwoodProjectPath + '/api/src/lib',
      functionsPath: redwoodProjectPath + '/api/src/functions',
    }
  },
)

vi.mock('@redwoodjs/cli-helpers', () => {
  return {
    getGraphqlPath: () => {
      return redwoodProjectPath + '/api/src/functions/graphql.ts'
    },
    getPaths: () => ({
      base: redwoodProjectPath,
      api: {
        dbSchema: dbSchemaPath,
        lib: libPath,
        functions: functionsPath,
      },
    }),
    colors: {
      error: (str: string) => str,
      warning: (str: string) => str,
      green: (str: string) => str,
      info: (str: string) => str,
      bold: (str: string) => str,
      underline: (str: string) => str,
    },
    addEnvVarTask: () => {},
  }
})

beforeAll(() => {
  process.env.RWJS_CWD = redwoodProjectPath
})

afterAll(() => {
  process.env.RWJS_CWD = RWJS_CWD
})

describe('setupData createUserModelTask (test-project)', () => {
  it('throws an error if a User model already exists', async () => {
    await expect(() => {
      return createUserModelTask.task({
        force: false,
        setupMode: 'UNKNOWN',
        provider: 'dbAuth',
      })
    }).rejects.toThrow('User model already exists')
  })
})
