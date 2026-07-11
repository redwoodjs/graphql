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
  assert,
} from 'vitest'

import { type AuthHandlerArgs } from '@redwoodjs/cli-helpers'

vi.mock('fs', async () => ({ ...memfs, default: memfs }))
vi.mock('node:fs', async () => ({ ...memfs, default: memfs }))

import { createAuthDecoderFunction, handler } from '../setupHandler'

const RWJS_CWD = process.env.RWJS_CWD

const { redwoodProjectPath } = vi.hoisted(() => {
  return { redwoodProjectPath: '/redwood-app' }
})

const mockLoginPagePath = path.join(
  redwoodProjectPath,
  'web/src/pages/LoginPage/LoginPage.tsx',
)

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

vi.mock('../shared', () => ({
  hasModel: () => false,
  hasAuthPages: () => {
    return memfs.existsSync(mockLoginPagePath)
  },
  generateAuthPagesTask: () => undefined,
  getModelNames: () => ['ExampleUser'],
  functionsPath: () => redwoodProjectPath + '/api/src/functions',
  libPath: () => redwoodProjectPath + '/api/src/lib',
}))

vi.mock('@redwoodjs/cli-helpers', () => {
  return {
    getGraphqlPath: () => {
      return redwoodProjectPath + '/api/src/functions/graphql.ts'
    },
    addEnvVarTask: () => undefined,
    getPaths: () => ({
      base: redwoodProjectPath,
    }),
    colors: {
      error: (str: string) => str,
      warning: (str: string) => str,
      green: (str: string) => str,
      info: (str: string) => str,
      bold: (str: string) => str,
      underline: (str: string) => str,
    },
    // I wish I could have used something like
    // vi.requireActual(@redwoodjs/cli-helpers) here, but I couldn't because
    // jest doesn't support ESM
    standardAuthHandler: async (args: AuthHandlerArgs) => {
      if (args.notes) {
        console.log(`\n   ${args.notes.join('\n   ')}\n`)
      }
    },
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

describe('dbAuth setup command', () => {
  it('does not duplicate authDecoder creation', async () => {
    const packageJsonPath = path.resolve(__dirname, '../../package.json')
    const graphqlTsPath = 'api/src/functions/graphql.ts'

    vol.fromJSON(
      {
        [packageJsonPath]: '{ "version": "0.0.0" }',
        [graphqlTsPath]: `
import { createGraphQLHandler } from '@redwoodjs/graphql-server'

import directives from 'src/directives/**/*.{js,ts}'
import sdls from 'src/graphql/**/*.sdl.{js,ts}'
import services from 'src/services/**/*.{js,ts}'

import { getCurrentUser } from 'src/lib/auth'
import { db } from 'src/lib/db'
import { logger } from 'src/lib/logger'

export const handler = createGraphQLHandler({
  getCurrentUser,
  loggerConfig: { logger, options: {} },
  directives,
  sdls,
  services,
  onException: () => {
    // Disconnect from your database with an unhandled exception.
    db.$disconnect()
  },
})
        `,
      },
      redwoodProjectPath,
    )

    createAuthDecoderFunction.task()
    const updatedGraphqlTs =
      vol.toJSON()[redwoodProjectPath + '/api/src/functions/graphql.ts']
    expect(updatedGraphqlTs).toMatch(/import { cookieName, getCurrentUser } fr/)
    expect(updatedGraphqlTs).toMatch(/const authDecoder = createAuthDecoder\(c/)
    expect(updatedGraphqlTs).toMatchSnapshot()

    // Running again shouldn't change anything in this case
    createAuthDecoderFunction.task()
    const updatedGraphqlTs2 =
      vol.toJSON()[redwoodProjectPath + '/api/src/functions/graphql.ts']
    expect(updatedGraphqlTs).toEqual(updatedGraphqlTs2)
  })

  it('prompts to generate pages', async () => {
    const packageJsonPath = path.resolve(__dirname, '../../package.json')

    vol.fromJSON(
      {
        [packageJsonPath]: '{ "version": "0.0.0" }',
      },
      redwoodProjectPath,
    )

    await handler({
      webauthn: false,
      createUserModel: false,
      generateAuthPages: null,
      force: false,
    })

    const promptsArg =
      vi.mocked<typeof prompts<'answer'>>(prompts).mock.calls[0][0]

    if (Array.isArray(promptsArg)) {
      assert.isNotArray(promptsArg, 'Expected a single prompt')
      return
    }

    expect(promptsArg.message).toMatch(/Generate auth pages/)
  })

  it('does not prompt to generate pages when pages already exist', async () => {
    const packageJsonPath = path.resolve(__dirname, '../../package.json')

    vol.fromJSON(
      {
        [packageJsonPath]: '{ "version": "0.0.0" }',
        [mockLoginPagePath]: 'export default () => <div>Login</div>',
      },
      redwoodProjectPath,
    )

    await handler({
      webauthn: false,
      createUserModel: false,
      generateAuthPages: null,
      force: false,
    })

    expect(vi.mocked(prompts)).not.toHaveBeenCalled()
  })

  describe('One More Thing... message', () => {
    describe('page generation hint', () => {
      it('is not included if page generation was already done as part of the setup process', async () => {
        const packageJsonPath = path.resolve(__dirname, '../../package.json')

        vol.fromJSON(
          {
            [packageJsonPath]: '{ "version": "0.0.0" }',
          },
          redwoodProjectPath,
        )

        await handler({
          webauthn: false,
          createUserModel: false,
          generateAuthPages: true,
          force: false,
        })

        expect(vi.mocked(console).log.mock.calls[0][0]).not.toContain(
          'yarn rw generate dbAuth',
        )
      })

      it('is not included for WebAuthn if page generation was already done as part of the setup process', async () => {
        const packageJsonPath = path.resolve(__dirname, '../../package.json')

        vol.fromJSON(
          {
            [packageJsonPath]: '{ "version": "0.0.0" }',
          },
          redwoodProjectPath,
        )

        await handler({
          webauthn: true,
          createUserModel: false,
          generateAuthPages: true,
          force: false,
        })

        expect(vi.mocked(console).log.mock.calls[0][0]).not.toContain(
          'yarn rw generate dbAuth',
        )
      })

      it('is not included if page generation and model generation was already done as part of the setup process', async () => {
        const packageJsonPath = path.resolve(__dirname, '../../package.json')

        vol.fromJSON(
          {
            [packageJsonPath]: '{ "version": "0.0.0" }',
          },
          redwoodProjectPath,
        )

        await handler({
          webauthn: false,
          createUserModel: true,
          generateAuthPages: true,
          force: false,
        })

        expect(vi.mocked(console).log.mock.calls[0][0]).not.toContain(
          'yarn rw generate dbAuth',
        )
      })

      it('is not included for WebAuthn if page generation and model generation was already done as part of the setup process', async () => {
        const packageJsonPath = path.resolve(__dirname, '../../package.json')

        vol.fromJSON(
          {
            [packageJsonPath]: '{ "version": "0.0.0" }',
          },
          redwoodProjectPath,
        )

        await handler({
          webauthn: true,
          createUserModel: true,
          generateAuthPages: true,
          force: false,
        })

        expect(vi.mocked(console).log.mock.calls[0][0]).not.toContain(
          'yarn rw generate dbAuth',
        )
      })

      it('is included if page generation was not done as part of the setup process', async () => {
        const packageJsonPath = path.resolve(__dirname, '../../package.json')

        vol.fromJSON(
          {
            [packageJsonPath]: '{ "version": "0.0.0" }',
          },
          redwoodProjectPath,
        )

        await handler({
          webauthn: false,
          createUserModel: false,
          generateAuthPages: false,
          force: false,
        })

        const logs: string[][] = [...vi.mocked(console).log.mock.calls]
        const oneMoreThingMessage = logs.find((log) => {
          return log[0].includes('Done! But you have a little more work to do')
        })?.[0]

        // Included exactly once
        expect(
          oneMoreThingMessage?.match(/yarn rw generate dbAuth/g),
        ).toHaveLength(1)
      })

      it('is included for WebAuthn if page generation was not done as part of the setup process', async () => {
        const packageJsonPath = path.resolve(__dirname, '../../package.json')

        vol.fromJSON(
          {
            [packageJsonPath]: '{ "version": "0.0.0" }',
          },
          redwoodProjectPath,
        )

        await handler({
          webauthn: true,
          createUserModel: false,
          generateAuthPages: false,
          force: false,
        })

        const firstLogMessage = vi.mocked(console).log.mock.calls[0][0]

        // Included exactly once
        expect(firstLogMessage.match(/and WebAuthn prompts/g)).toHaveLength(1)
        expect(firstLogMessage.match(/yarn rw generate dbAuth/g)).toHaveLength(
          1,
        )
      })
    })

    describe('db migration hint', () => {
      it('is not included if no db model was created', async () => {
        const packageJsonPath = path.resolve(__dirname, '../../package.json')

        vol.fromJSON(
          {
            [packageJsonPath]: '{ "version": "0.0.0" }',
          },
          redwoodProjectPath,
        )

        await handler({
          webauthn: false,
          createUserModel: false,
          generateAuthPages: true,
          force: false,
        })

        expect(vi.mocked(console).log.mock.calls[0][0]).not.toContain(
          'yarn rw prisma migrate dev',
        )
      })

      it('is not included for WebAuthn if no db model was created', async () => {
        const packageJsonPath = path.resolve(__dirname, '../../package.json')

        vol.fromJSON(
          {
            [packageJsonPath]: '{ "version": "0.0.0" }',
          },
          redwoodProjectPath,
        )

        await handler({
          webauthn: true,
          createUserModel: false,
          generateAuthPages: true,
          force: false,
        })

        expect(vi.mocked(console).log.mock.calls[0][0]).not.toContain(
          'yarn rw prisma migrate dev',
        )
      })

      it('is included if db model was created', async () => {
        const packageJsonPath = path.resolve(__dirname, '../../package.json')

        vol.fromJSON(
          {
            [packageJsonPath]: '{ "version": "0.0.0" }',
          },
          redwoodProjectPath,
        )

        await handler({
          webauthn: false,
          createUserModel: true,
          generateAuthPages: true,
          force: false,
        })

        expect(vi.mocked(console).log.mock.calls[0][0]).toContain(
          'yarn rw prisma migrate dev',
        )
      })

      it('is included if db model was created', async () => {
        const packageJsonPath = path.resolve(__dirname, '../../package.json')

        vol.fromJSON(
          {
            [packageJsonPath]: '{ "version": "0.0.0" }',
          },
          redwoodProjectPath,
        )

        await handler({
          webauthn: false,
          createUserModel: true,
          generateAuthPages: true,
          force: false,
        })

        expect(vi.mocked(console).log.mock.calls[0][0]).toContain(
          'yarn rw prisma migrate dev',
        )
      })
    })
  })
})
