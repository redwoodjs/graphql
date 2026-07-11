global.__dirname = __dirname
vi.mock('@redwoodjs/project-config', async (importOriginal) => {
  const originalProjectConfig = await importOriginal()
  const path = require('path')
  return {
    ...originalProjectConfig,
    getPaths: () => {
      const BASE_PATH = path.join(globalThis.__dirname, 'fixtures')
      return {
        base: BASE_PATH,
        api: {
          db: BASE_PATH, // this folder
          dbSchema: path.join(BASE_PATH, 'schema.prisma'),
        },
      }
    },
  }
})

import prompts from 'prompts'
import { vi, test, expect, describe, it } from 'vitest'

import { getSchema, verifyModelName } from '../schemaHelpers'

test('getSchema returns a parsed schema.prisma', async () => {
  let schema = await getSchema('Post')
  expect(schema.fields[0].name).toEqual('id')
  expect(schema.fields[1].name).toEqual('title')
  expect(schema.fields[2].name).toEqual('slug')

  // can get a different model
  schema = await getSchema('User')
  expect(schema.fields[0].name).toEqual('id')
  expect(schema.fields[1].name).toEqual('name')
  expect(schema.fields[2].name).toEqual('email')
})

test('getSchema throws an error if model name not found', async () => {
  let error

  try {
    await getSchema('Foo')
  } catch (e) {
    error = e
  }

  expect(error).toEqual(new Error(error.message))
})

describe('verifyModelName', () => {
  it('Accepts the model name in PascalCase', async () => {
    const modelName = await verifyModelName({ name: 'User' })
    expect(modelName).toEqual({ name: 'User' })
  })

  it('Accepts the model name in camelCase', async () => {
    const modelName = await verifyModelName({ name: 'user' })
    expect(modelName).toEqual({ name: 'User' })
  })

  it('Accepts the plural form of the model (in PascalCase) even if the model name is singular', async () => {
    const modelName = await verifyModelName({ name: 'Users' })
    expect(modelName).toEqual({ name: 'User' })
  })

  it('Accepts the plural form of the model (in camelCase) even if the model name is singular', async () => {
    const modelName = await verifyModelName({ name: 'users' })
    expect(modelName).toEqual({ name: 'User' })
  })

  it('Uses the plural form of the model if that model exists (PascalCase)', async () => {
    prompts.inject('CustomDatas')
    const modelName = await verifyModelName({ name: 'CustomData' })
    expect(modelName).toEqual({ name: 'CustomData' })
  })

  it('Uses the plural form of the model if that model exists (camelCase)', async () => {
    prompts.inject('CustomDatas')
    const modelName = await verifyModelName({ name: 'customData' })
    expect(modelName).toEqual({ name: 'CustomData' })
  })

  it('Uses the plural form of the model if that model exists (camelCase)', async () => {
    prompts.inject('CustomDatas')
    const modelName = await verifyModelName({ name: 'customData' })
    expect(modelName).toEqual({ name: 'CustomData' })
  })

  describe('case insensitivity', () => {
    test('CustomData', async () => {
      prompts.inject('CustomDatas')
      const modelName = await verifyModelName({ name: 'CustomData' })
      expect(modelName).toEqual({ name: 'CustomData' })
    })
    test('customData', async () => {
      prompts.inject('CustomDatas')
      const modelName = await verifyModelName({ name: 'customData' })
      expect(modelName).toEqual({ name: 'CustomData' })
    })
    test('customdata', async () => {
      prompts.inject('CustomDatas')
      const modelName = await verifyModelName({ name: 'customdata' })
      expect(modelName).toEqual({ name: 'CustomData' })
    })
    test('CUstOMdaTA', async () => {
      prompts.inject('CustomDatas')
      const modelName = await verifyModelName({ name: 'CUstOMdaTA' })
      expect(modelName).toEqual({ name: 'CustomData' })
    })

    test('userprofiles', async () => {
      const modelName = await verifyModelName({ name: 'userprofiles' })
      expect(modelName).toEqual({ name: 'UserProfile' })
    })
  })

  describe('Uses the plural form of the model even if a singular form also exists', () => {
    test('Pascalcase', async () => {
      prompts.inject('PostsList')
      const modelName = await verifyModelName({ name: 'Posts' })
      expect(modelName).toEqual({ name: 'Posts' })
    })

    test('camelCase', async () => {
      prompts.inject('PostsList')
      const modelName = await verifyModelName({ name: 'posts' })
      expect(modelName).toEqual({ name: 'Posts' })
    })
  })
})
