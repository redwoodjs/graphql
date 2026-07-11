import path from 'path'

import { CodeFileLoader } from '@graphql-tools/code-file-loader'
import { loadTypedefs } from '@graphql-tools/load'
import { mergeTypeDefs } from '@graphql-tools/merge'
import type { DocumentNode } from 'graphql'
import { describe, beforeAll, afterAll, test, expect } from 'vitest'

import { getPaths } from '@redwoodjs/project-config'

import {
  validateSchema,
  DIRECTIVE_REQUIRED_ERROR_MESSAGE,
  DIRECTIVE_INVALID_ROLE_TYPES_ERROR_MESSAGE,
} from '../validateSchema'

const FIXTURE_ERROR_PATH = path.resolve(
  __dirname,
  '../../../../__fixtures__/example-todo-main-with-errors',
)

const projectTypeSrc = async (sdlFile: string) =>
  await loadTypedefs([`graphql/**/${sdlFile}.sdl.{js,ts}`], {
    loaders: [
      new CodeFileLoader({
        noRequire: true,
        pluckConfig: {
          globalGqlIdentifierName: 'gql',
        },
      }),
    ],
    cwd: getPaths().api.src,
  })

const validateSdlFile = async (sdlFile: string) => {
  const projectTypeSrcFiles = await projectTypeSrc(sdlFile)

  // The output of the above function doesn't give us the documents directly
  const projectDocumentNodes = Object.values(projectTypeSrcFiles)
    .map(({ document }) => document)
    .filter((documentNode): documentNode is DocumentNode => {
      return !!documentNode
    })

  // Merge in the rootSchema with JSON scalars, etc.
  const mergedDocumentNode = mergeTypeDefs([projectDocumentNodes])
  validateSchema(mergedDocumentNode)
}

describe('SDL uses auth directives', () => {
  beforeAll(() => {
    process.env.RWJS_CWD = FIXTURE_ERROR_PATH
  })
  afterAll(() => {
    delete process.env.RWJS_CWD
  })

  describe('SDL is valid', () => {
    test('with proper roles set on directives', async () => {
      await expect(
        validateSdlFile('todosWithAuthRoles'),
      ).resolves.not.toThrowError()
    })

    test('with uppercase single string roles declared on a Mutation', async () => {
      await expect(
        validateSdlFile('todosMutations'),
      ).resolves.not.toThrowError()
    })

    test('with a built-in @deprecated directive', async () => {
      await expect(
        validateSdlFile('todosWithBuiltInDirectives'),
      ).resolves.not.toThrowError()
    })
  })

  describe('SDL is invalid', () => {
    test('because missing directives', async () => {
      await expect(validateSdlFile('todos')).rejects.toThrowError(
        DIRECTIVE_REQUIRED_ERROR_MESSAGE,
      )
    })

    test('due to auth role errors', async () => {
      await expect(
        validateSdlFile('todosWithAuthInvalidRolesErrors'),
      ).rejects.toThrowError(DIRECTIVE_INVALID_ROLE_TYPES_ERROR_MESSAGE)
    })

    test('due to auth role errors when the role is missing/null', async () => {
      await expect(
        validateSdlFile('todosWithAuthMissingRoleError'),
      ).rejects.toThrowError(DIRECTIVE_INVALID_ROLE_TYPES_ERROR_MESSAGE)
    })

    test('due to auth role being numeric instead of string', async () => {
      await expect(
        validateSdlFile('todosWithAuthMissingRoleError'),
      ).rejects.toThrowError(DIRECTIVE_INVALID_ROLE_TYPES_ERROR_MESSAGE)
    })

    describe('and SDL missing the roles attribute', () => {
      test('due to requireAuthDirective missing roles attribute but argument value is a string', async () => {
        await expect(
          validateSdlFile('todosWithMissingAuthRolesAttributeError'),
        ).rejects.toThrowError(
          'Syntax Error: Expected Name, found String "ADMIN"',
        )
      })

      test('due to requireAuthDirective missing roles attribute when argument value is numeric', async () => {
        await expect(
          validateSdlFile('todosWithMissingAuthRolesAttributeNumericError'),
        ).rejects.toThrowError('Syntax Error: Expected Name, found Int "42".')
      })
    })
  })
})
