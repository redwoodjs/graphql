import fs from 'fs'
import path from 'path'

import { afterEach, describe, test, expect, vi } from 'vitest'

import { getPaths } from '@redwoodjs/project-config'

import { generateGraphQLSchema } from '../generate/graphqlSchema'
import { generatePossibleTypes } from '../generate/possibleTypes'

afterEach(() => {
  delete process.env.RWJS_CWD
  vi.restoreAllMocks()
})

describe('Generate gql possible types web from the GraphQL Schema', () => {
  describe('when toml has graphql possible types turned off', () => {
    test('when there are *no* union types', async () => {
      const FIXTURE_PATH = path.resolve(
        __dirname,
        '../../../../__fixtures__/example-todo-main',
      )

      process.env.RWJS_CWD = FIXTURE_PATH

      await generateGraphQLSchema()

      vi.spyOn(fs, 'writeFileSync').mockImplementation(
        (file: fs.PathOrFileDescriptor, data: string | ArrayBufferView) => {
          expect(file).toMatch(
            path.join(getPaths().web.graphql, 'possibleTypes.ts'),
          )
          expect(data).toMatchSnapshot()
        },
      )

      const { possibleTypesFiles } = await generatePossibleTypes()

      expect(possibleTypesFiles).toHaveLength(0)
    })
  })

  describe('when toml has graphql possible types turned om', () => {
    test('when there are union types ', async () => {
      const FIXTURE_PATH = path.resolve(
        __dirname,
        '../../../../__fixtures__/fragment-test-project',
      )

      process.env.RWJS_CWD = FIXTURE_PATH
      await generateGraphQLSchema()

      vi.spyOn(fs, 'writeFileSync').mockImplementation(
        (file: fs.PathOrFileDescriptor, data: string | ArrayBufferView) => {
          expect(file).toMatch(
            path.join(getPaths().web.graphql, 'possibleTypes.ts'),
          )
          expect(data).toMatchSnapshot()
        },
      )

      const { possibleTypesFiles } = await generatePossibleTypes()

      expect(possibleTypesFiles).toHaveLength(1)
      expect(possibleTypesFiles[0]).toMatch(
        path.join(getPaths().web.graphql, 'possibleTypes.ts'),
      )
    })
  })
})
