import type fs from 'node:fs'
import path from 'node:path'

import { fs as memfs, vol } from 'memfs'
import prompts from 'prompts'
import {
  vi,
  beforeAll,
  beforeEach,
  afterAll,
  afterEach,
  describe,
  it,
  expect,
} from 'vitest'

import type { AuthHandlerArgs } from '@redwoodjs/cli-helpers'
import type { AuthGeneratorCtx } from '@redwoodjs/cli-helpers/src/auth/authTasks'

vi.mock('fs', async () => ({ ...memfs, default: memfs }))
vi.mock('node:fs', async () => ({ ...memfs, default: memfs }))

import { createUserModelTask } from '../setupData'
import { handler } from '../setupHandler'

const RWJS_CWD = process.env.RWJS_CWD
const { redwoodProjectPath, dbSchemaPath, libPath, functionsPath } = vi.hoisted(
  () => {
    const redwoodProjectPath = '/redwood-app'

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
    // I wish I could have used something like
    // vi.requireActual(@redwoodjs/cli-helpers) here, but I couldn't because
    // jest doesn't support ESM
    standardAuthHandler: async (args: AuthHandlerArgs) => {
      if (args.extraTasks) {
        const ctx: AuthGeneratorCtx = {
          force: args.forceArg,
          setupMode: 'UNKNOWN',
          provider: 'dbAuth',
        }

        for (const task of args.extraTasks) {
          if (task?.task) {
            await task.task(ctx, undefined as any)
          }
        }
      }

      if (args.notes) {
        console.log(`\n   ${args.notes.join('\n   ')}\n`)
      }
    },
  }
})

vi.mock('@prisma/internals', () => ({
  getSchema: () => {
    return memfs.readFileSync(dbSchemaPath, 'utf-8')
  },
  getDMMF: () => {
    const schema: string = memfs.readFileSync(dbSchemaPath, 'utf-8').toString()

    const models = schema
      .split('\n')
      .filter((line) => /model \w+ {/.test(line))
      .map((line) => line.split(' ')[1])
      .map((model) => ({ name: model }))

    return {
      datamodel: {
        models,
      },
    }
  },
}))

vi.mock('prompts', () => {
  return {
    __esModule: true,
    default: vi.fn(async (args: any) => {
      return {
        [args.name]: false,
      }
    }),
  }
})

beforeAll(() => {
  process.env.RWJS_CWD = redwoodProjectPath
})

afterAll(() => {
  process.env.RWJS_CWD = RWJS_CWD
})

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {})
})

afterEach(() => {
  vi.mocked(console).log.mockRestore?.()
  vi.mocked(prompts).mockClear?.()
})

describe('setupData createUserModelTask', () => {
  it('adds a User model to schema.prisma', async () => {
    vol.fromJSON(
      {
        'api/db/schema.prisma': `
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

generator client {
  provider      = "prisma-client-js"
  binaryTargets = "native"
}
`,
      },
      redwoodProjectPath,
    )

    await createUserModelTask.task({
      force: false,
      setupMode: 'UNKNOWN',
      provider: 'dbAuth',
    })

    const schema = memfs.readFileSync(dbSchemaPath, 'utf-8')
    expect(schema).toMatch(/^model User {$/m)
  })

  it('adds a User model to schema.prisma with existing UserExample model', async () => {
    vol.fromJSON(
      {
        'api/db/schema.prisma': `
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

generator client {
  provider      = "prisma-client-js"
  binaryTargets = "native"
}

// Define your own data models here and run 'yarn redwood prisma migrate dev'
// to create migrations for them and apply to your dev DB.
model UserExample {
  id    Int     @id @default(autoincrement())
  email String  @unique
  name  String?
}
`,
      },
      redwoodProjectPath,
    )

    await createUserModelTask.task({
      force: false,
      setupMode: 'UNKNOWN',
      provider: 'dbAuth',
    })

    const schema = memfs.readFileSync(dbSchemaPath, 'utf-8')
    expect(schema).toMatch(/^model User {$/m)
  })

  it('Does not add another User model if one already exists', async () => {
    vol.fromJSON(
      {
        'api/db/schema.prisma': `
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

generator client {
  provider      = "prisma-client-js"
  binaryTargets = "native"
}

model User {
  id    Int     @id @default(autoincrement())
  email String  @unique
  name  String?
}

model Post {
  id        Int      @id @default(autoincrement())
  title     String
  body      String
  authorId  Int
  author    User     @relation(fields: [authorId], references: [id])
  createdAt DateTime @default(now())
}
`,
      },
      redwoodProjectPath,
    )

    await expect(() => {
      return createUserModelTask.task({
        force: false,
        setupMode: 'UNKNOWN',
        provider: 'dbAuth',
      })
    }).rejects.toThrow('User model already exists')

    const schema = memfs.readFileSync(dbSchemaPath, 'utf-8').toString()

    expect(schema.match(/^model User {/gm)).toHaveLength(1)
  })

  it('automatically adds a User model in fresh projects', async () => {
    const packageJsonPath = path.resolve(__dirname, '../../package.json')

    vol.fromJSON(
      {
        [packageJsonPath]: '{ "version": "0.0.0" }',
        'api/src/functions/graphql.ts': `
import { createGraphQLHandler } from "@redwoodjs/graphql-server"

import { getCurrentUser } from 'src/lib/auth'
`,
        'api/db/schema.prisma': `
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

generator client {
  provider      = "prisma-client-js"
  binaryTargets = "native"
}

// Define your own data models here and run 'yarn redwood prisma migrate dev'
// to create migrations for them and apply to your dev DB.
model UserExample {
  id    Int     @id @default(autoincrement())
  email String  @unique
  name  String?
}
`,
      },
      redwoodProjectPath,
    )

    await handler({
      webauthn: false,
      createUserModel: null,
      generateAuthPages: false,
      force: false,
    })

    expect(vi.mocked(prompts)).not.toHaveBeenCalled()

    const schema = memfs.readFileSync(dbSchemaPath, 'utf-8').toString()
    expect(schema).toMatch(/^model User {$/m)
    expect(vi.mocked(console).log).toHaveBeenCalledWith(
      expect.stringContaining('Done! But you have a little more work to do:'),
    )
    expect(vi.mocked(console).log).not.toHaveBeenCalledWith(
      expect.stringContaining('resetTokenExpiresAt DateTime? // <─'),
    )
  })

  it('automatically adds a User model given the rwjs template schema.prisma', async () => {
    const packageJsonPath = path.resolve(__dirname, '../../package.json')
    const actualFs = await vi.importActual<typeof fs>('fs')

    vol.fromJSON(
      {
        [packageJsonPath]: '{ "version": "0.0.0" }',
        'api/src/functions/graphql.ts': `
import { createGraphQLHandler } from "@redwoodjs/graphql-server"

import { getCurrentUser } from 'src/lib/auth'
`,
        'api/db/schema.prisma': actualFs.readFileSync(
          path.resolve(
            __dirname +
              '/../../../../../create-redwood-app/templates/ts/api/db/schema.prisma',
          ),
          'utf-8',
        ),
      },
      redwoodProjectPath,
    )

    await handler({
      webauthn: false,
      createUserModel: null,
      generateAuthPages: false,
      force: false,
    })

    expect(vi.mocked(prompts)).not.toHaveBeenCalled()

    const schema = memfs.readFileSync(dbSchemaPath, 'utf-8')
    // Check for UserExample just to make sure we're reading the actual
    // template file and that it looks like we expect. So we're not just
    // getting an empty file or something
    expect(schema).toMatch(/^model UserExample {$/m)
    expect(schema).toMatch(/^model User {$/m)
    expect(vi.mocked(console).log).toHaveBeenCalledWith(
      expect.stringContaining('Done! But you have a little more work to do:'),
    )
    expect(vi.mocked(console).log).not.toHaveBeenCalledWith(
      expect.stringContaining('resetTokenExpiresAt DateTime? // <─'),
    )
  })

  it('does not automatically add a User model in projects with custom db models', async () => {
    const packageJsonPath = path.resolve(__dirname, '../../package.json')

    vol.fromJSON(
      {
        [packageJsonPath]: '{ "version": "0.0.0" }',
        'api/src/functions/graphql.ts': `
import { createGraphQLHandler } from "@redwoodjs/graphql-server"

import { getCurrentUser } from 'src/lib/auth'
`,
        'api/db/schema.prisma': `
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

generator client {
  provider      = "prisma-client-js"
  binaryTargets = "native"
}

model ExampleModel {
  id    Int     @id @default(autoincrement())
  email String  @unique
  name  String?
}
`,
      },
      redwoodProjectPath,
    )

    await handler({
      webauthn: false,
      createUserModel: null,
      generateAuthPages: false,
      force: false,
    })

    expect(vi.mocked(prompts)).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('Create User model?'),
      }),
    )

    const schema = memfs.readFileSync(dbSchemaPath, 'utf-8')
    expect(schema).not.toMatch(/^model User {$/m)
    expect(vi.mocked(console).log).toHaveBeenCalledWith(
      expect.stringContaining('Done! But you have a little more work to do:'),
    )
    expect(vi.mocked(console).log).toHaveBeenCalledWith(
      expect.stringContaining('resetTokenExpiresAt DateTime? // <─'),
    )
  })
})
